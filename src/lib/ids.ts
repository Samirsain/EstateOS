import { getDb } from "./db";

export const CUSTOMER_PREFIX = "TM";
export const MEMBER_PREFIX = "3C";
export const PLOT_PREFIX = "PLT";
export const ALLOTMENT_PREFIX = "ALT";
export const PROJECT_PREFIX = "PRJ";

const MEMBER_DIGITS = 3;
const CUSTOMER_DIGITS = 4;
const PLOT_DIGITS = 4;
const ALLOTMENT_DIGITS = 4;
const PROJECT_DIGITS = 3;

/**
 * Reserves the next value of a monotonic counter and renders it as
 * `<prefix><seq>` zero-padded to `digits`.
 */
export async function nextCode(
  tx: any,
  prefix: string,
  digits: number,
): Promise<string> {
  const db = tx || (await getDb());

  const result = await db.id_sequences.upsert({
    where: { prefix },
    update: { last_seq: { increment: 1 } },
    create: { prefix, last_seq: 1 },
  });

  const seq = result.last_seq;
  return `${prefix}${String(seq).padStart(digits, "0")}`;
}

export function nextCustomerCode(tx: any = null): Promise<string> {
  return nextCode(tx, CUSTOMER_PREFIX, CUSTOMER_DIGITS);
}

export function nextMemberCode(tx: any = null): Promise<string> {
  return nextCode(tx, MEMBER_PREFIX, MEMBER_DIGITS);
}

export function nextPlotCode(tx: any = null): Promise<string> {
  return nextCode(tx, PLOT_PREFIX, PLOT_DIGITS);
}

export function nextAllotmentCode(tx: any = null): Promise<string> {
  return nextCode(tx, ALLOTMENT_PREFIX, ALLOTMENT_DIGITS);
}

export function nextProjectCode(tx: any = null): Promise<string> {
  return nextCode(tx, PROJECT_PREFIX, PROJECT_DIGITS);
}

