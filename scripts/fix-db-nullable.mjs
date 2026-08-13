/**
 * Run with: node scripts/fix-db-nullable.mjs
 *
 * Fixes: SQLITE_CONSTRAINT: NOT NULL constraint failed: customers.member_id
 * Makes member_id and invite_code nullable so direct allotments work.
 */
import { createClient } from "@libsql/client";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "data", "cmms.db");

const db = createClient({ url: `file:${DB_PATH}` });

async function run() {
  console.log("📂 DB path:", DB_PATH);

  await db.execute("PRAGMA foreign_keys = OFF");

  // ── Fix customers ──────────────────────────────────────────────────────────
  const custInfo = await db.execute("PRAGMA table_info(customers)");
  const custMemberCol = custInfo.rows.find((r) => r.name === "member_id");

  if (custMemberCol && Number(custMemberCol.notnull) === 1) {
    console.log("🔧 Fixing customers.member_id (removing NOT NULL)...");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers_v2 (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_code     TEXT NOT NULL UNIQUE,
        name              TEXT NOT NULL,
        mobile            TEXT NOT NULL UNIQUE,
        customer_type     TEXT NOT NULL CHECK (customer_type IN ('User', 'Investor')),
        aadhaar_encrypted TEXT NOT NULL,
        aadhaar_index     TEXT NOT NULL UNIQUE,
        aadhaar_last4     TEXT NOT NULL,
        member_id         INTEGER REFERENCES members(id),
        invite_code       TEXT,
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        created_by        INTEGER REFERENCES users(id)
      )
    `);

    await db.execute(`
      INSERT OR IGNORE INTO customers_v2
        (id, customer_code, name, mobile, customer_type,
         aadhaar_encrypted, aadhaar_index, aadhaar_last4,
         member_id, invite_code, created_at, created_by)
      SELECT
        id, customer_code, name, mobile, customer_type,
        aadhaar_encrypted, aadhaar_index, aadhaar_last4,
        member_id, invite_code, created_at, created_by
      FROM customers
    `);

    await db.execute("DROP TABLE customers");
    await db.execute("ALTER TABLE customers_v2 RENAME TO customers");
    console.log("✅ customers fixed!");
  } else {
    console.log("✅ customers.member_id is already nullable — no change needed.");
  }

  // ── Fix plot_allotments ────────────────────────────────────────────────────
  const paInfo = await db.execute("PRAGMA table_info(plot_allotments)");
  const paMemberCol = paInfo.rows.find((r) => r.name === "member_id");

  if (paMemberCol && Number(paMemberCol.notnull) === 1) {
    console.log("🔧 Fixing plot_allotments.member_id (removing NOT NULL)...");

    await db.execute(`
      CREATE TABLE IF NOT EXISTS pa_v2 (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        allotment_code TEXT NOT NULL UNIQUE,
        plot_id        INTEGER NOT NULL UNIQUE REFERENCES plots(id),
        customer_id    INTEGER NOT NULL REFERENCES customers(id),
        member_id      INTEGER REFERENCES members(id),
        agreed_price   REAL NOT NULL,
        booking_amount REAL NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'Partial',
        allotment_date TEXT NOT NULL DEFAULT (datetime('now')),
        notes          TEXT,
        created_by     INTEGER REFERENCES users(id),
        created_at     TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      INSERT OR IGNORE INTO pa_v2
        (id, allotment_code, plot_id, customer_id, member_id,
         agreed_price, booking_amount, payment_status, allotment_date,
         notes, created_by, created_at)
      SELECT
        id, allotment_code, plot_id, customer_id, member_id,
        agreed_price, booking_amount, payment_status, allotment_date,
        notes, created_by, created_at
      FROM plot_allotments
    `);

    await db.execute("DROP TABLE plot_allotments");
    await db.execute("ALTER TABLE pa_v2 RENAME TO plot_allotments");
    console.log("✅ plot_allotments fixed!");
  } else {
    console.log("✅ plot_allotments.member_id is already nullable — no change needed.");
  }

  await db.execute("PRAGMA foreign_keys = ON");
  console.log("\n🎉 Done! Restart your dev server now.");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
