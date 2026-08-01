import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName, verifySession } from "./session";
import type { Role, SessionUser } from "./types";

/**
 * Capability model from PRD §1. The MD has full access; the PC runs the office
 * but cannot transfer ownership, delete records, manage users or read the audit
 * log.
 */
export const PERMISSIONS = {
  "dashboard.view": ["MD", "PC"],
  "members.view": ["MD", "PC"],
  "members.create": ["MD", "PC"],
  "members.edit": ["MD", "PC"],
  "members.delete": ["MD"],
  "customers.view": ["MD", "PC"],
  "customers.create": ["MD", "PC"],
  "customers.delete": ["MD"],
  "customers.transfer": ["MD"],
  "reports.view": ["MD", "PC"],
  "reports.export": ["MD", "PC"],
  "audit.view": ["MD"],
  "settings.manage": ["MD"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Returns the signed-in user, or null when there is no valid session. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySession(store.get(sessionCookieName)?.value);
}

/** Returns the signed-in user, redirecting to the login page when absent. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/**
 * Guards a page or server action behind a capability. Middleware already blocks
 * the obvious routes, but every privileged entry point re-checks here so that a
 * direct POST to a server action cannot bypass the rule.
 */
export async function requirePermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/dashboard?denied=" + permission);
  return user;
}

/** Throws instead of redirecting — for use inside server actions. */
export async function assertPermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new Error("Not authenticated");
  if (!can(user.role, permission)) {
    throw new Error(`Role ${user.role} is not permitted to ${permission}`);
  }
  return user;
}
