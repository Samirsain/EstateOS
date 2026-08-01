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
  const db = getDb();

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

  const member = db
    .prepare<[string], MemberRow>("SELECT * FROM members WHERE member_code = ?")
    .get(memberCode);

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
  const mobileClash = db
    .prepare<[string], CustomerRow & { member_code: string; member_name: string }>(
      `SELECT c.*, m.member_code, m.name AS member_name
         FROM customers c JOIN members m ON m.id = c.member_id
        WHERE c.mobile = ?`,
    )
    .get(mobile);

  if (mobileClash) {
    recordDuplicateAttempt({
      field: "mobile",
      entity: "customer",
      maskedValue: mobile,
      existingCode: mobileClash.customer_code,
      attemptedName: name,
      actor,
    });
    recordAudit({
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
  const aadhaarClash = db
    .prepare<[string], CustomerRow & { member_code: string; member_name: string }>(
      `SELECT c.*, m.member_code, m.name AS member_name
         FROM customers c JOIN members m ON m.id = c.member_id
        WHERE c.aadhaar_index = ?`,
    )
    .get(aadhaarIndex);

  if (aadhaarClash) {
    recordDuplicateAttempt({
      field: "aadhaar",
      entity: "customer",
      maskedValue: maskAadhaar(aadhaar),
      existingCode: aadhaarClash.customer_code,
      attemptedName: name,
      actor,
    });
    recordAudit({
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

  const create = db.transaction((): string => {
    const code = nextCustomerCode(db);
    db.prepare(
      `INSERT INTO customers (
         customer_code, name, mobile, customer_type, aadhaar_encrypted,
         aadhaar_index, aadhaar_last4, member_id, invite_code, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      code,
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
    );
    return code;
  });

  let customerCode: string;
  try {
    customerCode = create();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE")) {
      return {
        ok: false,
        message:
          "Registration blocked — this customer was registered by another operator moments ago.",
      };
    }
    throw error;
  }

  recordAudit({
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
  const db = getDb();

  const customerCode = requireText(formData.get("customerCode"), { max: 40 });
  const toMemberCode = requireText(formData.get("toMemberCode"), { max: 40 });
  const reason = requireText(formData.get("reason"), { max: 500 });

  if (!customerCode || !toMemberCode) {
    return { ok: false, message: "Select both a customer and the new member." };
  }

  const customer = db
    .prepare<[string], CustomerRow>(
      "SELECT * FROM customers WHERE customer_code = ?",
    )
    .get(customerCode);

  if (!customer) return { ok: false, message: "Customer not found." };

  const toMember = db
    .prepare<[string], MemberRow>("SELECT * FROM members WHERE member_code = ?")
    .get(toMemberCode);

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

  const fromMember = db
    .prepare<[number], MemberRow>("SELECT * FROM members WHERE id = ?")
    .get(customer.member_id)!;

  db.transaction(() => {
    db.prepare(
      "UPDATE customers SET member_id = ?, invite_code = ? WHERE id = ?",
    ).run(toMember.id, toMember.invite_code, customer.id);

    db.prepare(
      `INSERT INTO transfers (customer_id, from_member_id, to_member_id, reason, transferred_by)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(customer.id, fromMember.id, toMember.id, reason || null, actor.id);
  })();

  recordAudit({
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
