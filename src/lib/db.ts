import { createClient, type Client, type Transaction } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { hashPassword } from "./crypto";

/*
 * Kept statically scoped to a known subfolder so Next's file tracer does not
 * treat the whole project as a dependency of this module.
 */
const DB_PATH = process.env.CMMS_DB_PATH
  ? resolve(process.env.CMMS_DB_PATH)
  : join(process.cwd(), "data", "cmms.db");

/**
 * Anything a query function can run a statement against — the shared client
 * for a plain read/write, or an interactive Transaction where two writes
 * (e.g. reserving a sequence number and inserting the row that consumes it)
 * must commit or roll back together.
 */
export type SqlExecutor = Client | Transaction;

/*
 * Next.js re-evaluates modules across hot reloads in development, so the
 * client (and its one-time migration/seed) is cached on globalThis to avoid
 * reopening the connection and re-running setup on every request.
 */
const globalForDb = globalThis as unknown as {
  cmmsDb?: Client;
  cmmsDbReady?: Promise<void>;
};

function createConnection(): Client {
  const url = process.env.TURSO_DATABASE_URL;

  if (url) {
    return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }

  /*
   * No Turso configuration: fall back to a local SQLite file via libSQL's
   * embedded mode. This is what local development and any host with a
   * writable disk use — only production behind a read-only filesystem
   * (Vercel, most serverless platforms) needs TURSO_DATABASE_URL set.
   */
  mkdirSync(dirname(DB_PATH), { recursive: true });
  return createClient({ url: `file:${DB_PATH}` });
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('MD', 'PC')),
    password_hash TEXT NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    created_by    INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS members (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    member_code       TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    mobile            TEXT NOT NULL UNIQUE,
    alternate_mobile  TEXT,
    city              TEXT,
    company_name      TEXT,
    deals_in          TEXT NOT NULL DEFAULT '[]',
    experience        TEXT,
    aadhaar_encrypted TEXT NOT NULL,
    aadhaar_index     TEXT NOT NULL UNIQUE,
    aadhaar_last4     TEXT NOT NULL,
    invite_code       TEXT NOT NULL UNIQUE,
    is_active         INTEGER NOT NULL DEFAULT 1,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    created_by        INTEGER REFERENCES users(id)
  );

  /*
   * Business rules enforced at the storage layer so they hold even if an
   * application-level check is ever bypassed:
   *   One Mobile  = One Customer  -> UNIQUE(mobile)
   *   One Aadhaar = One Customer  -> UNIQUE(aadhaar_index)
   *   One Customer = One Member   -> single non-null member_id column
   */
  CREATE TABLE IF NOT EXISTS customers (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_code     TEXT NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    mobile            TEXT NOT NULL UNIQUE,
    customer_type     TEXT NOT NULL CHECK (customer_type IN ('User', 'Investor')),
    aadhaar_encrypted TEXT NOT NULL,
    aadhaar_index     TEXT NOT NULL UNIQUE,
    aadhaar_last4     TEXT NOT NULL,
    member_id         INTEGER NOT NULL REFERENCES members(id),
    invite_code       TEXT NOT NULL,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    created_by        INTEGER REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_customers_member ON customers(member_id);
  CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at);
  CREATE INDEX IF NOT EXISTS idx_members_created ON members(created_at);

  CREATE TABLE IF NOT EXISTS transfers (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id    INTEGER NOT NULL REFERENCES customers(id),
    from_member_id INTEGER NOT NULL REFERENCES members(id),
    to_member_id   INTEGER NOT NULL REFERENCES members(id),
    reason         TEXT,
    transferred_by INTEGER NOT NULL REFERENCES users(id),
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS duplicate_attempts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    field          TEXT NOT NULL CHECK (field IN ('mobile', 'aadhaar')),
    entity         TEXT NOT NULL CHECK (entity IN ('customer', 'member')),
    masked_value   TEXT NOT NULL,
    existing_code  TEXT,
    attempted_name TEXT,
    attempted_by   INTEGER REFERENCES users(id),
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_duplicate_created ON duplicate_attempts(created_at);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id   INTEGER REFERENCES users(id),
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_ref TEXT,
    details    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

  /*
   * Monotonic counters backing ID generation. The counter is never reset, so a
   * generated ID can never repeat even if records are deleted.
   */
  CREATE TABLE IF NOT EXISTS id_sequences (
    prefix   TEXT PRIMARY KEY,
    last_seq INTEGER NOT NULL DEFAULT 0
  );
`;

async function migrate(client: Client): Promise<void> {
  await client.executeMultiple(SCHEMA);
}

async function seed(client: Client): Promise<void> {
  const existing = await client.execute(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'MD'",
  );
  const count = Number(existing.rows[0]?.count ?? 0);
  if (count > 0) return;

  const username = process.env.CMMS_MD_USERNAME ?? "md";
  const password = process.env.CMMS_MD_PASSWORD ?? "ChangeMe@123";

  await client.execute({
    sql: `INSERT INTO users (username, name, role, password_hash)
          VALUES (?, ?, 'MD', ?)`,
    args: [username, "Managing Director", hashPassword(password)],
  });
}

/**
 * Returns the shared libSQL client, running the one-time migration and seed
 * on first use. Every caller awaits the same setup promise, so concurrent
 * requests during a cold start don't race to create the schema twice.
 */
export async function getDb(): Promise<Client> {
  if (!globalForDb.cmmsDb) {
    globalForDb.cmmsDb = createConnection();
  }
  if (!globalForDb.cmmsDbReady) {
    globalForDb.cmmsDbReady = migrate(globalForDb.cmmsDb).then(() =>
      seed(globalForDb.cmmsDb!),
    );
  }
  await globalForDb.cmmsDbReady;
  return globalForDb.cmmsDb;
}
