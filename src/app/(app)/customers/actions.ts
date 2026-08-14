"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { addToBlacklist, removeFromBlacklist } from "@/lib/blacklist";
import { recalcCommissionEligibility, recalcRoyaltyStatus } from "@/lib/referrals";
import { getDb } from "@/lib/db";
import { nextMemberCode } from "@/lib/ids";
import { requireText } from "@/lib/validation";

/** Permanently removes a customer. Nothing else in the app depends on the row. */
export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const actor = await assertPermission("customers.delete");
  const code = requireText(formData.get("customerCode"), { max: 40 });
  const db = await getDb();

  const customer = await db.customers.findUnique({
    where: { customer_code: code },
  });
  if (!customer) return;

  await db.customers.delete({
    where: { id: customer.id },
  });

  await removeFromBlacklist("CUSTOMER", customer.id);
  /* Their purchases no longer count toward the referring member's milestone. */
  await recalcRoyaltyStatus(customer.member_id);

  await recordAudit({
    actor,
    action: "customer.deleted",
    entity: "customer",
    entityRef: code,
    details: { name: customer.name },
  });

  revalidatePath("/customers");
  redirect("/customers");
}

/** Promotes a top-performing customer directly to a Full Member */
export async function promoteCustomerToMemberAction(formData: FormData): Promise<void> {
  const actor = await assertPermission("members.create");
  const customerCode = requireText(formData.get("customerCode"), { max: 40 });
  const db = await getDb();

  const customer = await db.customers.findUnique({
    where: { customer_code: customerCode },
  });

  if (!customer || customer.promoted_to_member_id) return;
  /* A blacklisted buyer must not be able to re-enter the network as a member. */
  if (customer.is_blacklisted) return;

  const previousMemberId = customer.member_id;
  const newMemberCode = await nextMemberCode();

  // Create corresponding Member record, keeping the original referrer as parent
  // so the member who first brought them in retains their lineage credit.
  const newMember = await db.members.create({
    data: {
      member_code: newMemberCode,
      name: customer.name,
      mobile: customer.mobile,
      aadhaar_encrypted: customer.aadhaar_encrypted,
      aadhaar_index: customer.aadhaar_index,
      aadhaar_last4: customer.aadhaar_last4,
      invite_code: newMemberCode,
      referred_by_member_id: previousMemberId,
      created_by: actor.id,
    },
  });

  // Link customer record to new Member ID
  await db.customers.update({
    where: { id: customer.id },
    data: { promoted_to_member_id: newMember.id },
  });

  // Reassign all sub-customers referred by this customer to the new Member profile
  await db.customers.updateMany({
    where: { referred_by_customer_id: customer.id },
    data: { member_id: newMember.id },
  });

  /* The promoted user now occupies a commission slot under their referrer, and
     the sub-customers they brought moved off the old member's books. */
  if (previousMemberId) await recalcCommissionEligibility(previousMemberId);
  await recalcRoyaltyStatus(previousMemberId);
  await recalcRoyaltyStatus(newMember.id);

  await recordAudit({
    actor,
    action: "customer.promoted_to_member",
    entity: "customer",
    entityRef: customerCode,
    details: { new_member_code: newMemberCode },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerCode}`);
  revalidatePath("/members");
  redirect(`/members/${newMemberCode}`);
}

/** Toggles Global Blacklist status for a Customer */
export async function toggleBlacklistCustomerAction(formData: FormData): Promise<void> {
  const actor = await assertPermission("customers.delete");
  const customerCode = requireText(formData.get("customerCode"), { max: 40 });
  const reason =
    requireText(formData.get("reason"), { max: 200 }) ||
    "Policy violation / Payment default";
  const db = await getDb();

  const customer = await db.customers.findUnique({
    where: { customer_code: customerCode },
  });

  if (!customer) return;

  const currentlyBlacklisted = Boolean(customer.is_blacklisted);
  const nextStatus = !currentlyBlacklisted;

  await db.customers.update({
    where: { id: customer.id },
    data: { is_blacklisted: nextStatus },
  });

  if (nextStatus) {
    await addToBlacklist(
      {
        type: "CUSTOMER",
        id: customer.id,
        code: customer.customer_code,
        name: customer.name,
        mobile: customer.mobile,
        aadhaarLast4: customer.aadhaar_last4,
        aadhaarIndex: customer.aadhaar_index,
      },
      reason,
      actor,
    );
  } else {
    await removeFromBlacklist("CUSTOMER", customer.id);
  }

  await recordAudit({
    actor,
    action: nextStatus ? "customer.blacklisted" : "customer.unblacklisted",
    entity: "customer",
    entityRef: customerCode,
    details: { reason },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerCode}`);
}

