import type { SqlExecutor } from "./db";

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
 * strictly increasing and an ID can never be reissued. The caller must run
 * this inside the same transaction as the INSERT that consumes the ID;
 * otherwise a failed insert would burn a sequence number.
 */
export async function nextCode(
  db: SqlExecutor,
  prefix: string,
  date: Date = new Date(),
): Promise<string> {
  const result = await db.execute({
    sql: `INSERT INTO id_sequences (prefix, last_seq) VALUES (?, 1)
          ON CONFLICT(prefix) DO UPDATE SET last_seq = last_seq + 1
          RETURNING last_seq`,
    args: [prefix],
  });

  const seq = Number(result.rows[0].last_seq);
  return `${prefix}${String(seq).padStart(4, "0")}-${formatIdDate(date)}`;
}

export function nextCustomerCode(db: SqlExecutor, date?: Date): Promise<string> {
  return nextCode(db, CUSTOMER_PREFIX, date);
}

export function nextMemberCode(db: SqlExecutor, date?: Date): Promise<string> {
  return nextCode(db, MEMBER_PREFIX, date);
}
