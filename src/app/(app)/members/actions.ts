"use server";

import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/auth";
import { recordAudit, recordDuplicateAttempt } from "@/lib/audit";
import {
  blindIndex,
  encryptField,
  generateInviteCode,
  maskAadhaar,
} from "@/lib/crypto";
import { getDb } from "@/lib/db";
import type { SqlExecutor } from "@/lib/db";
import { nextMemberCode } from "@/lib/ids";
import type { ActionState, MemberRow } from "@/lib/types";
import { DEALS_IN_OPTIONS } from "@/lib/types";
import {
  getAllValues,
  isValidAadhaar,
  isValidMobile,
  normaliseAadhaar,
  normaliseMobile,
  requireText,
} from "@/lib/validation";

interface MemberInput {
  name: string;
  dealerName: string;
  mobile: string;
  alternateMobile: string;
  city: string;
  companyName: string;
  dealsIn: string[];
  experience: string;
  aadhaar: string;
}

function readMemberForm(formData: FormData): MemberInput {
  return {
    name: requireText(formData.get("name")),
    dealerName: requireText(formData.get("dealerName")),
    mobile: normaliseMobile(requireText(formData.get("mobile"), { max: 20 })),
    alternateMobile: normaliseMobile(
      requireText(formData.get("alternateMobile"), { max: 20 }),
    ),
    city: requireText(formData.get("city")),
    companyName: requireText(formData.get("companyName")),
    dealsIn: getAllValues(formData, "dealsIn").filter((value) =>
      (DEALS_IN_OPTIONS as string[]).includes(value),
    ),
    experience: requireText(formData.get("experience"), { max: 60 }),
    aadhaar: normaliseAadhaar(requireText(formData.get("aadhaar"), { max: 20 })),
  };
}

function validateMember(input: MemberInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.name) errors.name = "Name is required.";
  if (!input.mobile) errors.mobile = "Mobile number is required.";
  else if (!isValidMobile(input.mobile))
    errors.mobile = "Enter a valid 10-digit Indian mobile number.";
  if (input.alternateMobile && !isValidMobile(input.alternateMobile))
    errors.alternateMobile = "Enter a valid 10-digit Indian mobile number.";
  if (input.alternateMobile && input.alternateMobile === input.mobile)
    errors.alternateMobile = "Alternate mobile must differ from the primary.";
  if (!input.aadhaar) errors.aadhaar = "Aadhaar number is required.";
  else if (!isValidAadhaar(input.aadhaar))
    errors.aadhaar = "Enter a valid 12-digit Aadhaar number.";
  if (input.dealsIn.length === 0)
    errors.dealsIn = "Select at least one category.";

  return errors;
}

/** Draws invite codes until an unused one is found. */
async function allocateInviteCode(db: SqlExecutor): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateInviteCode();
    const result = await db.execute({
      sql: "SELECT id FROM members WHERE invite_code = ?",
      args: [code],
    });
    if (result.rows.length === 0) return code;
  }
  throw new Error("Could not allocate a unique invite code");
}

export async function createMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertPermission("members.create");
  const input = readMemberForm(formData);
  const errors = validateMember(input);

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Please correct the highlighted fields.", errors };
  }

  const db = await getDb();
  const aadhaarIndex = blindIndex(input.aadhaar);

  const mobileResult = await db.execute({
    sql: "SELECT * FROM members WHERE mobile = ?",
    args: [input.mobile],
  });
  const mobileClash = mobileResult.rows[0] as unknown as MemberRow | undefined;

  if (mobileClash) {
    await recordDuplicateAttempt({
      field: "mobile",
      entity: "member",
      maskedValue: input.mobile,
      existingCode: mobileClash.member_code,
      attemptedName: input.name,
      actor,
    });
    await recordAudit({
      actor,
      action: "member.duplicate_blocked",
      entity: "member",
      entityRef: mobileClash.member_code,
      details: { field: "mobile" },
    });
    return {
      ok: false,
      message: `This mobile number is already registered to member ${mobileClash.member_code} (${mobileClash.name}).`,
      errors: { mobile: "Already registered." },
    };
  }

  const aadhaarResult = await db.execute({
    sql: "SELECT * FROM members WHERE aadhaar_index = ?",
    args: [aadhaarIndex],
  });
  const aadhaarClash = aadhaarResult.rows[0] as unknown as MemberRow | undefined;

  if (aadhaarClash) {
    await recordDuplicateAttempt({
      field: "aadhaar",
      entity: "member",
      maskedValue: maskAadhaar(input.aadhaar),
      existingCode: aadhaarClash.member_code,
      attemptedName: input.name,
      actor,
    });
    await recordAudit({
      actor,
      action: "member.duplicate_blocked",
      entity: "member",
      entityRef: aadhaarClash.member_code,
      details: { field: "aadhaar" },
    });
    return {
      ok: false,
      message: `This Aadhaar number is already registered to member ${aadhaarClash.member_code} (${aadhaarClash.name}).`,
      errors: { aadhaar: "Already registered." },
    };
  }

  /*
   * The ID reservation and the INSERT share one transaction: if the insert
   * trips a UNIQUE constraint (a concurrent registration between the checks
   * above and here) the sequence number rolls back with it and is not burned.
   */
  const tx = await db.transaction("write");
  let created: { code: string; invite: string };
  try {
    const code = await nextMemberCode(tx);
    const invite = await allocateInviteCode(tx);

    await tx.execute({
      sql: `INSERT INTO members (
              member_code, name, dealer_name, mobile, alternate_mobile, city,
              company_name, deals_in, experience, aadhaar_encrypted, aadhaar_index,
              aadhaar_last4, invite_code, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        code,
        input.name,
        input.dealerName || null,
        input.mobile,
        input.alternateMobile || null,
        input.city || null,
        input.companyName || null,
        JSON.stringify(input.dealsIn),
        input.experience || null,
        encryptField(input.aadhaar),
        aadhaarIndex,
        input.aadhaar.slice(-4),
        invite,
        actor.id,
      ],
    });

    await tx.commit();
    created = { code, invite };
  } catch (error) {
    await tx.rollback().catch(() => {});
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE")) {
      return {
        ok: false,
        message:
          "This member was registered by another operator moments ago. Search for the existing record.",
      };
    }
    throw error;
  } finally {
    tx.close();
  }

  await recordAudit({
    actor,
    action: "member.created",
    entity: "member",
    entityRef: created.code,
    details: { name: input.name, invite_code: created.invite },
  });

  revalidatePath("/members");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message: `Member ${created.code} registered. Invite code: ${created.invite}`,
    createdCode: created.code,
  };
}

export async function updateMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertPermission("members.edit");
  const code = requireText(formData.get("memberCode"), { max: 40 });
  const db = await getDb();

  const existingResult = await db.execute({
    sql: "SELECT * FROM members WHERE member_code = ?",
    args: [code],
  });
  const existing = existingResult.rows[0] as unknown as MemberRow | undefined;

  if (!existing) return { ok: false, message: "Member not found." };

  const input = readMemberForm(formData);
  const errors = validateMember(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Please correct the highlighted fields.", errors };
  }

  const aadhaarIndex = blindIndex(input.aadhaar);

  const clashResult = await db.execute({
    sql: `SELECT * FROM members
           WHERE (mobile = ? OR aadhaar_index = ?) AND id != ?`,
    args: [input.mobile, aadhaarIndex, existing.id],
  });
  const clash = clashResult.rows[0] as unknown as MemberRow | undefined;

  if (clash) {
    return {
      ok: false,
      message: `Those details belong to member ${clash.member_code} (${clash.name}).`,
    };
  }

  await db.execute({
    sql: `UPDATE members SET
            name = ?, dealer_name = ?, mobile = ?, alternate_mobile = ?, city = ?,
            company_name = ?, deals_in = ?, experience = ?, aadhaar_encrypted = ?,
            aadhaar_index = ?, aadhaar_last4 = ?
          WHERE id = ?`,
    args: [
      input.name,
      input.dealerName || null,
      input.mobile,
      input.alternateMobile || null,
      input.city || null,
      input.companyName || null,
      JSON.stringify(input.dealsIn),
      input.experience || null,
      encryptField(input.aadhaar),
      aadhaarIndex,
      input.aadhaar.slice(-4),
      existing.id,
    ],
  });

  await recordAudit({
    actor,
    action: "member.updated",
    entity: "member",
    entityRef: code,
    details: { name: input.name },
  });

  revalidatePath("/members");
  revalidatePath(`/members/${code}`);

  return { ok: true, message: "Member details updated." };
}

/**
 * Deactivation replaces deletion: the referral history behind a member must
 * remain intact, and only the MD may take a member out of circulation.
 */
export async function setMemberActiveAction(formData: FormData): Promise<void> {
  const actor = await assertPermission("members.delete");
  const code = requireText(formData.get("memberCode"), { max: 40 });
  const active = formData.get("active") === "1" ? 1 : 0;
  const db = await getDb();

  await db.execute({
    sql: "UPDATE members SET is_active = ? WHERE member_code = ?",
    args: [active, code],
  });

  await recordAudit({
    actor,
    action: active ? "member.reactivated" : "member.deactivated",
    entity: "member",
    entityRef: code,
  });

  revalidatePath("/members");
  revalidatePath(`/members/${code}`);
}
