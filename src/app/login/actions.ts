"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/audit";
import { verifyPassword } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { sessionCookieName, sessionMaxAge, signSession } from "@/lib/session";
import type { ActionState, SessionUser, UserRow } from "@/lib/types";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  if (!username || !password) {
    return { ok: false, message: "Enter both username and password." };
  }

  const row = getDb()
    .prepare<[string], UserRow>("SELECT * FROM users WHERE username = ?")
    .get(username);

  /*
   * A single generic message for unknown user, wrong password and disabled
   * account, so the form cannot be used to enumerate valid usernames.
   */
  const invalid: ActionState = {
    ok: false,
    message: "Invalid username or password.",
  };

  if (!row || !row.is_active) return invalid;
  if (!verifyPassword(password, row.password_hash)) {
    recordAudit({
      actor: null,
      action: "login.failed",
      entity: "user",
      entityRef: username,
    });
    return invalid;
  }

  const user: SessionUser = {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
  };

  const store = await cookies();
  store.set(sessionCookieName, await signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge,
  });

  recordAudit({
    actor: user,
    action: "login.success",
    entity: "user",
    entityRef: user.username,
  });

  /* Only allow same-site relative paths, never an absolute URL. */
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(sessionCookieName);
  redirect("/login");
}
