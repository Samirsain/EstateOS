"use server";

import { revalidatePath } from "next/cache";
import { recordAudit } from "@/lib/audit";
import { assertPermission } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import type { ActionState, UserRow } from "@/lib/types";
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
  const existingResult = await db.execute({
    sql: "SELECT * FROM users WHERE username = ?",
    args: [username],
  });
  const existing = existingResult.rows[0] as unknown as UserRow | undefined;

  if (existing) {
    return {
      ok: false,
      message: "That username is already taken.",
      errors: { username: "Already in use." },
    };
  }

  await db.execute({
    sql: `INSERT INTO users (username, name, role, password_hash, created_by)
          VALUES (?, ?, ?, ?, ?)`,
    args: [username, name, role, hashPassword(password), actor.id],
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
  const result = await db.execute({
    sql: "UPDATE users SET password_hash = ? WHERE username = ?",
    args: [hashPassword(password), username],
  });

  if (result.rowsAffected === 0) return { ok: false, message: "User not found." };

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
  await db.execute({
    sql: "UPDATE users SET is_active = ? WHERE username = ?",
    args: [active, username],
  });

  await recordAudit({
    actor,
    action: active ? "user.enabled" : "user.disabled",
    entity: "user",
    entityRef: username,
  });

  revalidatePath("/settings");
}
