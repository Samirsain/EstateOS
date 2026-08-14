"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/auth";
import { recordAudit, recordDuplicateAttempt } from "@/lib/audit";
import { blindIndex, encryptField, maskAadhaar } from "@/lib/crypto";
import { addToBlacklist, checkBlacklist, removeFromBlacklist } from "@/lib/blacklist";
import { recalcCommissionEligibility } from "@/lib/referrals";
import { getDb } from "@/lib/db";
import { nextMemberCode } from "@/lib/ids";
import type { ActionState } from "@/lib/types";
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
  reraNo: string;
  email: string;
  aadhaar: string;
  referredByMemberId: number | null;
}

function readMemberForm(formData: FormData): MemberInput {
  const refId = String(formData.get("referredByMemberId") ?? "").trim();
  return {
    name: requireText(formData.get("name")).toUpperCase(),
    mobile: normaliseMobile(requireText(formData.get("mobile"), { max: 20 })),
    alternateMobile: normaliseMobile(
      requireText(formData.get("alternateMobile"), { max: 20 }),
    ),
    city: requireText(formData.get("city")).toUpperCase(),
    companyName: requireText(formData.get("companyName")).toUpperCase(),
    dealsIn: getAllValues(formData, "dealsIn").filter((value) =>
      (DEALS_IN_OPTIONS as string[]).includes(value),
    ),
    experience: requireText(formData.get("experience"), { max: 60 }).toUpperCase(),
    reraNo: requireText(formData.get("reraNo"), { max: 50 }).toUpperCase(),
    email: requireText(formData.get("email"), { max: 100 }).toLowerCase(),
    aadhaar: normaliseAadhaar(requireText(formData.get("aadhaar"), { max: 20 })),
    referredByMemberId: refId ? Number(refId) : null,
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
  if (input.aadhaar && !isValidAadhaar(input.aadhaar))
    errors.aadhaar = "Enter a valid 12-digit Aadhaar number.";

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

  if (input.aadhaar) {
    const aadhaarClash = await db.members.findUnique({
      where: { aadhaar_index: blindIndex(input.aadhaar) },
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
  }

  // Global blacklist verification — mobile, Aadhaar hash and name+city.
  const verdict = await checkBlacklist({
    mobile: input.mobile,
    aadhaar: input.aadhaar,
    name: input.name,
    city: input.city,
  });
  if (verdict.blocked) {
    return {
      ok: false,
      message: `Registration blocked. ${verdict.message}`,
      errors:
        verdict.factor === "mobile"
          ? { mobile: "Blacklisted mobile number." }
          : verdict.factor === "aadhaar"
            ? { aadhaar: "Blacklisted Aadhaar number." }
            : { name: "Matches a blacklisted record." },
    };
  }

  let created: { code: string; invite: string };
  try {
    const code = await nextMemberCode();
    const aadhaarIndex = input.aadhaar
      ? blindIndex(input.aadhaar)
      : blindIndex(`NONE_${code}_${Date.now()}`);

    const createData: Prisma.membersCreateInput = {
      member_code: code,
      name: input.name,
      mobile: input.mobile,
      alternate_mobile: input.alternateMobile || null,
      city: input.city || null,
      company_name: input.companyName || null,
      deals_in: JSON.stringify(input.dealsIn),
      experience: input.experience || null,
      rera_no: input.reraNo || null,
      email: input.email || null,
      aadhaar_encrypted: encryptField(input.aadhaar || "000000000000"),
      aadhaar_index: aadhaarIndex,
      aadhaar_last4: input.aadhaar ? input.aadhaar.slice(-4) : "0000",
      invite_code: code,
      creator: { connect: { id: actor.id } },
      ...(input.referredByMemberId
        ? { referred_by: { connect: { id: input.referredByMemberId } } }
        : {}),
    };

    await db.members.create({ data: createData });

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

  /* Recompute the parent's whole referral set: the first three by registration
     time hold the commission slots, whoever won the insert race. */
  if (input.referredByMemberId) {
    await recalcCommissionEligibility(input.referredByMemberId);
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

  if (input.aadhaar) {
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
  } else {
    const clash = await db.members.findFirst({
      where: {
        mobile: input.mobile,
        NOT: { id: existing.id },
      },
    });
    if (clash) {
      return {
        ok: false,
        message: `Mobile number belongs to member ${clash.member_code} (${clash.name}).`,
      };
    }
  }

  const updateData: Prisma.membersUpdateInput = {
    name: input.name,
    mobile: input.mobile,
    alternate_mobile: input.alternateMobile || null,
    city: input.city || null,
    company_name: input.companyName || null,
    deals_in: JSON.stringify(input.dealsIn),
    experience: input.experience || null,
    rera_no: input.reraNo || null,
    email: input.email || null,
    referred_by: input.referredByMemberId
      ? { connect: { id: input.referredByMemberId } }
      : { disconnect: true },
    ...(input.aadhaar
      ? {
          aadhaar_encrypted: encryptField(input.aadhaar),
          aadhaar_index: blindIndex(input.aadhaar),
          aadhaar_last4: input.aadhaar.slice(-4),
        }
      : {}),
  };

  await db.members.update({
    where: { id: existing.id },
    data: updateData,
  });

  /* A changed referrer reshuffles the commission slots on both sides. */
  if (existing.referred_by_member_id !== input.referredByMemberId) {
    if (existing.referred_by_member_id) {
      await recalcCommissionEligibility(existing.referred_by_member_id);
    }
    if (input.referredByMemberId) {
      await recalcCommissionEligibility(input.referredByMemberId);
    }
  }

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
 * Blacklists a member across every project, or lifts the blacklist.
 *
 * This is distinct from deactivation: `is_active` takes a member out of the
 * assignment dropdowns, while blacklisting writes into the shared registry so
 * the identity is refused at every future registration and allotment.
 */
export async function toggleBlacklistMemberAction(
  formData: FormData,
): Promise<void> {
  const actor = await assertPermission("members.delete");
  const code = requireText(formData.get("memberCode"), { max: 40 });
  const reason =
    requireText(formData.get("reason"), { max: 200 }) ||
    "Policy violation / Payment default";
  const db = await getDb();

  const member = await db.members.findUnique({
    where: { member_code: code },
  });
  if (!member) return;

  const nextStatus = !member.is_blacklisted;

  await db.members.update({
    where: { id: member.id },
    data: { is_blacklisted: nextStatus },
  });

  if (nextStatus) {
    await addToBlacklist(
      {
        type: "MEMBER",
        id: member.id,
        code: member.member_code,
        name: member.name,
        mobile: member.mobile,
        aadhaarLast4: member.aadhaar_last4,
        aadhaarIndex: member.aadhaar_index,
        city: member.city,
      },
      reason,
      actor,
    );
  } else {
    await removeFromBlacklist("MEMBER", member.id);
  }

  await recordAudit({
    actor,
    action: nextStatus ? "member.blacklisted" : "member.unblacklisted",
    entity: "member",
    entityRef: code,
    details: { reason },
  });

  revalidatePath("/members");
  revalidatePath(`/members/${code}`);
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

  await removeFromBlacklist("MEMBER", member.id);

  /* Deleting a member frees their commission slot for the next sibling. */
  if (member.referred_by_member_id) {
    await recalcCommissionEligibility(member.referred_by_member_id);
  }

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
