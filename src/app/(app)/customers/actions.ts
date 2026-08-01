"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { recordAudit, recordDuplicateAttempt } from "@/lib/audit";
import { blindIndex, encryptField, maskAadhaar } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { nextCustomerCode } from "@/lib/ids";
import type { ActionState, CustomerRow, MemberRow } from "@/lib/types";
import { CUSTOMER_TYPES } from "@/lib/types";
import {
  isValidAadhaar,
  isValidMobile,
  normaliseAadhaar,
  normaliseMobile,
  requireText,
} from "@/lib/validation";

export async function createCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertPermission("customers.create");
  const db = await getDb();

  const name = requireText(formData.get("name"));
  const mobile = normaliseMobile(requireText(formData.get("mobile"), { max: 20 }));
  const aadhaar = normaliseAadhaar(
    requireText(formData.get("aadhaar"), { max: 20 }),
  );
  const customerType = requireText(formData.get("customerType"), { max: 20 });
  const memberCode = requireText(formData.get("memberCode"), { max: 40 });

  const errors: Record<string, string> = {};

  if (!name) errors.name = "Name is required.";
  if (!mobile) errors.mobile = "Mobile number is required.";
  else if (!isValidMobile(mobile))
    errors.mobile = "Enter a valid 10-digit Indian mobile number.";
  if (!aadhaar) errors.aadhaar = "Aadhaar number is required.";
  else if (!isValidAadhaar(aadhaar))
    errors.aadhaar = "Enter a valid 12-digit Aadhaar number.";
  if (!(CUSTOMER_TYPES as string[]).includes(customerType))
    errors.customerType = "Select User or Investor.";
  if (!memberCode) errors.memberCode = "Select the referring member.";

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Please correct the highlighted fields.", errors };
  }

  const memberResult = await db.execute({
    sql: "SELECT * FROM members WHERE member_code = ?",
    args: [memberCode],
  });
  const member = memberResult.rows[0] as unknown as MemberRow | undefined;

  if (!member) {
    return {
      ok: false,
      message: "That member could not be found.",
      errors: { memberCode: "Unknown member." },
    };
  }

  if (!member.is_active) {
    return {
      ok: false,
      message: `Member ${member.member_code} is inactive and cannot take new referrals.`,
      errors: { memberCode: "Member is inactive." },
    };
  }

  /*
   * Duplicate prevention (PRD §5, §6). Both checks run before any ID is
   * reserved, so a blocked registration never consumes a Customer ID. The
   * matching UNIQUE constraints in the schema are the backstop for races.
   */
  const mobileResult = await db.execute({
    sql: `SELECT c.*, m.member_code, m.name AS member_name
            FROM customers c JOIN members m ON m.id = c.member_id
           WHERE c.mobile = ?`,
    args: [mobile],
  });
  const mobileClash = mobileResult.rows[0] as unknown as
    | (CustomerRow & { member_code: string; member_name: string })
    | undefined;

  if (mobileClash) {
    await recordDuplicateAttempt({
      field: "mobile",
      entity: "customer",
      maskedValue: mobile,
      existingCode: mobileClash.customer_code,
      attemptedName: name,
      actor,
    });
    await recordAudit({
      actor,
      action: "customer.duplicate_blocked",
      entity: "customer",
      entityRef: mobileClash.customer_code,
      details: { field: "mobile", attempted_name: name },
    });
    return {
      ok: false,
      message: `Registration blocked — one mobile number can belong to only one customer. ${mobile} is already registered as ${mobileClash.customer_code} (${mobileClash.name}), owned by ${mobileClash.member_code} ${mobileClash.member_name}.`,
      errors: { mobile: "Already registered to another customer." },
    };
  }

  const aadhaarIndex = blindIndex(aadhaar);
  const aadhaarResult = await db.execute({
    sql: `SELECT c.*, m.member_code, m.name AS member_name
            FROM customers c JOIN members m ON m.id = c.member_id
           WHERE c.aadhaar_index = ?`,
    args: [aadhaarIndex],
  });
  const aadhaarClash = aadhaarResult.rows[0] as unknown as
    | (CustomerRow & { member_code: string; member_name: string })
    | undefined;

  if (aadhaarClash) {
    await recordDuplicateAttempt({
      field: "aadhaar",
      entity: "customer",
      maskedValue: maskAadhaar(aadhaar),
      existingCode: aadhaarClash.customer_code,
      attemptedName: name,
      actor,
    });
    await recordAudit({
      actor,
      action: "customer.duplicate_blocked",
      entity: "customer",
      entityRef: aadhaarClash.customer_code,
      details: { field: "aadhaar", attempted_name: name },
    });
    return {
      ok: false,
      message: `Registration blocked — one Aadhaar number can belong to only one customer. It is already registered as ${aadhaarClash.customer_code} (${aadhaarClash.name}), owned by ${aadhaarClash.member_code} ${aadhaarClash.member_name}.`,
      errors: { aadhaar: "Already registered to another customer." },
    };
  }

  const tx = await db.transaction("write");
  let customerCode: string;
  try {
    customerCode = await nextCustomerCode(tx);
    await tx.execute({
      sql: `INSERT INTO customers (
              customer_code, name, mobile, customer_type, aadhaar_encrypted,
              aadhaar_index, aadhaar_last4, member_id, invite_code, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        customerCode,
        name,
        mobile,
        customerType,
        encryptField(aadhaar),
        aadhaarIndex,
        aadhaar.slice(-4),
        member.id,
        /* Ownership is recorded from the member record, never from client input. */
        member.invite_code,
        actor.id,
      ],
    });
    await tx.commit();
  } catch (error) {
    await tx.rollback().catch(() => {});
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE")) {
      return {
        ok: false,
        message:
          "Registration blocked — this customer was registered by another operator moments ago.",
      };
    }
    throw error;
  } finally {
    tx.close();
  }

  await recordAudit({
    actor,
    action: "customer.created",
    entity: "customer",
    entityRef: customerCode,
    details: {
      name,
      customer_type: customerType,
      member_code: member.member_code,
    },
  });

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath(`/members/${member.member_code}`);

  return {
    ok: true,
    message: `Customer ${customerCode} registered and assigned to ${member.member_code}.`,
    createdCode: customerCode,
  };
}

/**
 * Ownership transfer (PRD §6: "Only MD can transfer customer ownership").
 * The permission check here is what actually enforces the rule — middleware
 * only hides the page.
 */
export async function transferCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertPermission("customers.transfer");
  const db = await getDb();

  const customerCode = requireText(formData.get("customerCode"), { max: 40 });
  const toMemberCode = requireText(formData.get("toMemberCode"), { max: 40 });
  const reason = requireText(formData.get("reason"), { max: 500 });

  if (!customerCode || !toMemberCode) {
    return { ok: false, message: "Select both a customer and the new member." };
  }

  const customerResult = await db.execute({
    sql: "SELECT * FROM customers WHERE customer_code = ?",
    args: [customerCode],
  });
  const customer = customerResult.rows[0] as unknown as CustomerRow | undefined;

  if (!customer) return { ok: false, message: "Customer not found." };

  const toMemberResult = await db.execute({
    sql: "SELECT * FROM members WHERE member_code = ?",
    args: [toMemberCode],
  });
  const toMember = toMemberResult.rows[0] as unknown as MemberRow | undefined;

  if (!toMember) return { ok: false, message: "Destination member not found." };
  if (!toMember.is_active)
    return {
      ok: false,
      message: `Member ${toMember.member_code} is inactive and cannot receive customers.`,
    };

  if (toMember.id === customer.member_id) {
    return {
      ok: false,
      message: "That customer already belongs to the selected member.",
    };
  }

  const fromMemberResult = await db.execute({
    sql: "SELECT * FROM members WHERE id = ?",
    args: [customer.member_id],
  });
  const fromMember = fromMemberResult.rows[0] as unknown as MemberRow;

  const tx = await db.transaction("write");
  try {
    await tx.execute({
      sql: "UPDATE customers SET member_id = ?, invite_code = ? WHERE id = ?",
      args: [toMember.id, toMember.invite_code, customer.id],
    });
    await tx.execute({
      sql: `INSERT INTO transfers (customer_id, from_member_id, to_member_id, reason, transferred_by)
            VALUES (?, ?, ?, ?, ?)`,
      args: [customer.id, fromMember.id, toMember.id, reason || null, actor.id],
    });
    await tx.commit();
  } finally {
    tx.close();
  }

  await recordAudit({
    actor,
    action: "customer.transferred",
    entity: "customer",
    entityRef: customer.customer_code,
    details: {
      from: fromMember.member_code,
      to: toMember.member_code,
      reason: reason || null,
    },
  });

  revalidatePath("/transfers");
  revalidatePath("/customers");
  revalidatePath(`/customers/${customer.customer_code}`);
  revalidatePath(`/members/${fromMember.member_code}`);
  revalidatePath(`/members/${toMember.member_code}`);

  return {
    ok: true,
    message: `${customer.customer_code} transferred from ${fromMember.member_code} to ${toMember.member_code}.`,
  };
}
