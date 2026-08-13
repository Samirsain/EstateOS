"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/auth";
import { recordAudit, recordDuplicateAttempt } from "@/lib/audit";
import { blindIndex, encryptField, maskAadhaar } from "@/lib/crypto";
import { getDb } from "@/lib/db";
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

  const mobileClash = await db.members.findUnique({
    where: { mobile: input.mobile },
  });

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

  const aadhaarClash = await db.members.findUnique({
    where: { aadhaar_index: aadhaarIndex },
  });

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

  let created: { code: string; invite: string };
  try {
    const code = await nextMemberCode();

    await db.members.create({
      data: {
        member_code: code,
        name: input.name,
        mobile: input.mobile,
        alternate_mobile: input.alternateMobile || null,
        city: input.city || null,
        company_name: input.companyName || null,
        deals_in: JSON.stringify(input.dealsIn),
        experience: input.experience || null,
        aadhaar_encrypted: encryptField(input.aadhaar),
        aadhaar_index: aadhaarIndex,
        aadhaar_last4: input.aadhaar.slice(-4),
        invite_code: code,
        created_by: actor.id,
      },
    });

    created = { code, invite: code };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE") || message.includes("Unique constraint")) {
      return {
        ok: false,
        message:
          "This member was registered by another operator moments ago. Search for the existing record.",
      };
    }
    throw error;
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
    message: `Member ${created.code} registered.`,
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

  const existing = await db.members.findUnique({
    where: { member_code: code },
  });

  if (!existing) return { ok: false, message: "Member not found." };

  const input = readMemberForm(formData);
  const errors = validateMember(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Please correct the highlighted fields.", errors };
  }

  const aadhaarIndex = blindIndex(input.aadhaar);

  const clash = await db.members.findFirst({
    where: {
      OR: [{ mobile: input.mobile }, { aadhaar_index: aadhaarIndex }],
      NOT: { id: existing.id },
    },
  });

  if (clash) {
    return {
      ok: false,
      message: `Those details belong to member ${clash.member_code} (${clash.name}).`,
    };
  }

  await db.members.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      mobile: input.mobile,
      alternate_mobile: input.alternateMobile || null,
      city: input.city || null,
      company_name: input.companyName || null,
      deals_in: JSON.stringify(input.dealsIn),
      experience: input.experience || null,
      aadhaar_encrypted: encryptField(input.aadhaar),
      aadhaar_index: aadhaarIndex,
      aadhaar_last4: input.aadhaar.slice(-4),
    },
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

  await db.members.update({
    where: { member_code: code },
    data: { is_active: active },
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

/**
 * Permanently removes a member. Only allowed when the member has no
 * customers referred to them — deleting a member with customers on the
 * books would orphan those customer records (their member_id would point
 * nowhere). The member detail page already hides this action in that case;
 * this check is the server-side backstop against a direct form POST.
 */
export async function deleteMemberAction(formData: FormData): Promise<void> {
  const actor = await assertPermission("members.delete");
  const code = requireText(formData.get("memberCode"), { max: 40 });
  const db = await getDb();

  const member = await db.members.findUnique({
    where: { member_code: code },
    include: { _count: { select: { customers: true } } },
  });
  if (!member) return;

  if (member._count.customers > 0) return;

  await db.members.delete({
    where: { id: member.id },
  });

  await recordAudit({
    actor,
    action: "member.deleted",
    entity: "member",
    entityRef: code,
    details: { name: member.name },
  });

  revalidatePath("/members");
  redirect("/members");
}
