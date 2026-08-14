import type { Prisma } from "@prisma/client";
import { getDb } from "./db";

/**
 * Either an interactive transaction client or the shared client. Sequence
 * reservation must be able to join a caller's transaction so a rolled-back
 * insert does not leave a gap in the code series.
 */
export type SequenceClient = Prisma.TransactionClient | null;

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
  tx: SequenceClient,
  prefix: string,
  digits: number,
): Promise<string> {
  const db = tx ?? getDb();

  const result = await db.id_sequences.upsert({
    where: { prefix },
    update: { last_seq: { increment: 1 } },
    create: { prefix, last_seq: 1 },
  });

  const seq = result.last_seq;
  return `${prefix}${String(seq).padStart(digits, "0")}`;
}

export function nextCustomerCode(tx: SequenceClient = null): Promise<string> {
  return nextCode(tx, CUSTOMER_PREFIX, CUSTOMER_DIGITS);
}

export function nextMemberCode(tx: SequenceClient = null): Promise<string> {
  return nextCode(tx, MEMBER_PREFIX, MEMBER_DIGITS);
}

export function nextPlotCode(tx: SequenceClient = null): Promise<string> {
  return nextCode(tx, PLOT_PREFIX, PLOT_DIGITS);
}

export function nextAllotmentCode(tx: SequenceClient = null): Promise<string> {
  return nextCode(tx, ALLOTMENT_PREFIX, ALLOTMENT_DIGITS);
}

export function nextProjectCode(tx: SequenceClient = null): Promise<string> {
  return nextCode(tx, PROJECT_PREFIX, PROJECT_DIGITS);
}

