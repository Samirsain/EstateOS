"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import type { ActionState } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { requireText } from "@/lib/validation";

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertPermission("settings.manage");

  const username = requireText(formData.get("username"), { max: 40 })
    .toLowerCase()
    .replace(/\s+/g, "");
  const name = requireText(formData.get("name"));
  const role = requireText(formData.get("role"), { max: 4 });
  const password = String(formData.get("password") ?? "");

  const errors: Record<string, string> = {};

  if (!username) errors.username = "Username is required.";
  else if (!/^[a-z0-9._-]{3,40}$/.test(username))
    errors.username =
      "Use 3-40 characters: lowercase letters, digits, dot, underscore or hyphen.";
  if (!name) errors.name = "Full name is required.";
  if (!(ROLES as string[]).includes(role)) errors.role = "Select a role.";
  if (password.length < 8)
    errors.password = "Use at least 8 characters.";

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Please correct the highlighted fields.", errors };
  }

  const db = await getDb();
  const existing = await db.users.findUnique({
    where: { username },
  });

  if (existing) {
    return {
      ok: false,
      message: "That username is already taken.",
      errors: { username: "Already in use." },
    };
  }

  await db.users.create({
    data: {
      username,
      name,
      role,
      password_hash: hashPassword(password),
      created_by: actor.id,
    },
  });

  await recordAudit({
    actor,
    action: "user.created",
    entity: "user",
    entityRef: username,
    details: { role, name },
  });

  revalidatePath("/settings");

  return { ok: true, message: `${role} account "${username}" created.` };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await assertPermission("settings.manage");
  const username = requireText(formData.get("username"), { max: 40 });
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return {
      ok: false,
      message: "Use at least 8 characters.",
      errors: { password: "Too short." },
    };
  }

  const db = await getDb();
  const user = await db.users.findUnique({ where: { username } });
  if (!user) return { ok: false, message: "User not found." };

  await db.users.update({
    where: { username },
    data: { password_hash: hashPassword(password) },
  });

  await recordAudit({
    actor,
    action: "user.password_reset",
    entity: "user",
    entityRef: username,
  });

  revalidatePath("/settings");
  return { ok: true, message: `Password reset for "${username}".` };
}

export async function setUserActiveAction(formData: FormData): Promise<void> {
  const actor = await assertPermission("settings.manage");
  const username = requireText(formData.get("username"), { max: 40 });
  const active = formData.get("active") === "1" ? 1 : 0;

  /* The MD cannot lock themselves out of their own console. */
  if (username === actor.username) return;

  const db = await getDb();
  await db.users.update({
    where: { username },
    data: { is_active: active },
  });

  await recordAudit({
    actor,
    action: active ? "user.enabled" : "user.disabled",
    entity: "user",
    entityRef: username,
  });

  revalidatePath("/settings");
}

export async function updatePermissionsMatrixAction(formData: FormData): Promise<ActionState> {
  try {
    const actor = await assertPermission("settings.manage");
    const db = await getDb();

    // Clear and update permissions based on submitted form
    const entries = Array.from(formData.entries());

    for (const [key, val] of entries) {
      if (key.startsWith("perm_")) {
        // e.g. perm_PC_plots.create = "1"
        const [, role, ...permParts] = key.split("_");
        const perm = permParts.join("_");
        const allowed = val === "1";

        await db.role_permissions.upsert({
          where: {
            role_permission: { role, permission: perm },
          },
          update: { allowed: allowed ? 1 : 0 },
          create: { role, permission: perm, allowed: allowed ? 1 : 0 },
        });
      }
    }

    await recordAudit({
      actor,
      action: "permissions.updated",
      entity: "role_permissions",
      entityRef: "matrix",
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/plots");
    revalidatePath("/members");
    revalidatePath("/customers");

    return { ok: true, message: "Role permission matrix updated successfully!" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to update permissions." };
  }
}

