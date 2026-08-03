import type { SqlExecutor } from "./db";

export const CUSTOMER_PREFIX = "TM";
export const MEMBER_PREFIX = "3C";

const MEMBER_DIGITS = 3;
const CUSTOMER_DIGITS = 4;

/**
 * Reserves the next value of a monotonic counter and renders it as
 * `<prefix><seq>` zero-padded to `digits` — e.g. 3C000, 3C001... for members
 * or TM0000, TM0001... for customers.
 *
 * The counter starts at 0, is stored per prefix and never reset, so a
 * sequence number is strictly increasing and can never repeat. The caller
 * must run this inside the same transaction as the INSERT that consumes the
 * ID; otherwise a failed insert would burn a sequence number.
 */
export async function nextCode(
  db: SqlExecutor,
  prefix: string,
  digits: number,
): Promise<string> {
  const result = await db.execute({
    sql: `INSERT INTO id_sequences (prefix, last_seq) VALUES (?, 0)
          ON CONFLICT(prefix) DO UPDATE SET last_seq = last_seq + 1
          RETURNING last_seq`,
    args: [prefix],
  });

  const seq = Number(result.rows[0].last_seq);
  return `${prefix}${String(seq).padStart(digits, "0")}`;
}

export function nextCustomerCode(db: SqlExecutor): Promise<string> {
  return nextCode(db, CUSTOMER_PREFIX, CUSTOMER_DIGITS);
}

export function nextMemberCode(db: SqlExecutor): Promise<string> {
  return nextCode(db, MEMBER_PREFIX, MEMBER_DIGITS);
}
