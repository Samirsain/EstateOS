import type { Database } from "better-sqlite3";

export const CUSTOMER_PREFIX = "TM";
export const MEMBER_PREFIX = "3C";

/** Formats a date as DDMMYYYY, the suffix used by both ID formats. */
export function formatIdDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}${month}${date.getFullYear()}`;
}

/**
 * Reserves the next value of a monotonic counter and renders it as
 * `<prefix><seq>-<DDMMYYYY>` — e.g. TM0001-29072026 or 3C0001-29072026.
 *
 * The counter is stored per prefix and never reset, so sequence numbers are
 * strictly increasing and an ID can never be reissued. The caller must run this
 * inside the same transaction as the INSERT that consumes the ID; otherwise a
 * failed insert would burn a sequence number.
 */
export function nextCode(
  db: Database,
  prefix: string,
  date: Date = new Date(),
): string {
  const row = db
    .prepare<[string], { last_seq: number }>(
      `INSERT INTO id_sequences (prefix, last_seq) VALUES (?, 1)
       ON CONFLICT(prefix) DO UPDATE SET last_seq = last_seq + 1
       RETURNING last_seq`,
    )
    .get(prefix)!;

  return `${prefix}${String(row.last_seq).padStart(4, "0")}-${formatIdDate(date)}`;
}

export function nextCustomerCode(db: Database, date?: Date): string {
  return nextCode(db, CUSTOMER_PREFIX, date);
}

export function nextMemberCode(db: Database, date?: Date): string {
  return nextCode(db, MEMBER_PREFIX, date);
}
