import type { Prisma } from "@prisma/client";
import { getDb } from "./db";

/**
 * Callers inside an interactive transaction pass their transaction client so
 * the recalculation commits or rolls back with the change that triggered it.
 */
export type ReferralClient = Prisma.TransactionClient;

/** SYSTEM_SPECIFICATION §2.1 — only the first 3 referrals earn commission. */
export const COMMISSION_ELIGIBLE_SLOTS = 3;

/** SYSTEM_SPECIFICATION §2.2 — verified customer purchases that unlock royalty. */
export const ROYALTY_CUSTOMER_THRESHOLD = 5;

/**
 * Recomputes `is_commission_eligible` for every member referred by `parentId`.
 *
 * Recomputing the whole sibling set from `created_at ASC` rather than counting
 * existing rows at insert time means two operators registering referrals
 * concurrently cannot both read "2 so far" and both claim the third slot, and
 * deleting an early referral promotes the next one into the freed slot.
 */
export async function recalcCommissionEligibility(
  parentId: number,
  client?: ReferralClient,
): Promise<void> {
  const db = client ?? getDb();

  const siblings = await db.members.findMany({
    where: { referred_by_member_id: parentId },
    select: { id: true, is_commission_eligible: true },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });

  await Promise.all(
    siblings.map((sibling, index) => {
      const shouldBeEligible = index < COMMISSION_ELIGIBLE_SLOTS;
      if (sibling.is_commission_eligible === shouldBeEligible) return null;
      return db.members.update({
        where: { id: sibling.id },
        data: { is_commission_eligible: shouldBeEligible },
      });
    }),
  );
}

/**
 * Counts a member's *verified* customer sales: distinct customers who actually
 * hold a plot allotment. Registering five customers is not the milestone —
 * five of them completing a purchase is. Customer mobile and Aadhaar are both
 * unique columns, so distinct customer rows are already distinct people; that
 * closes the "split one buyer across five names" loophole from the risk audit.
 */
export async function countVerifiedCustomerSales(
  memberId: number,
  client?: ReferralClient,
): Promise<number> {
  const db = client ?? getDb();
  return db.customers.count({
    where: {
      member_id: memberId,
      allotments: { some: {} },
    },
  });
}

/**
 * Re-evaluates royalty status in both directions. Cancelling a sale that drops
 * a member back under the threshold takes the status away again, so the badge
 * always reflects the current books.
 */
export async function recalcRoyaltyStatus(
  memberId: number | null | undefined,
  client?: ReferralClient,
): Promise<void> {
  if (!memberId) return;
  const db = client ?? getDb();

  const sales = await countVerifiedCustomerSales(memberId, client);
  const unlocked = sales >= ROYALTY_CUSTOMER_THRESHOLD;

  const member = await db.members.findUnique({
    where: { id: memberId },
    select: { royalty_unlocked: true },
  });
  if (!member || member.royalty_unlocked === unlocked) return;

  await db.members.update({
    where: { id: memberId },
    data: { royalty_unlocked: unlocked },
  });
}
