import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName, verifySession } from "./session";
import type { Role, SessionUser } from "./types";
import { getDb } from "./db";

export interface PermissionDefinition {
  key: string;
  label: string;
  category: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  { key: "dashboard.view", label: "View Dashboard & Analytics", category: "Dashboard" },
  { key: "plots.view", label: "View Plots Inventory", category: "Plots Inventory" },
  { key: "plots.create", label: "Create & Edit Plots", category: "Plots Inventory" },
  { key: "plots.delete", label: "Delete Plots from Inventory", category: "Plots Inventory" },
  { key: "projects.create", label: "Create Real Estate Projects", category: "Plots Inventory" },
  { key: "projects.delete", label: "Delete Real Estate Projects", category: "Plots Inventory" },
  { key: "plots.allot", label: "Allot / Book Plots to Customers", category: "Plots Inventory" },
  { key: "members.view", label: "View Members List", category: "Members" },
  { key: "members.create", label: "Register New Members", category: "Members" },
  { key: "members.edit", label: "Edit Member Details", category: "Members" },
  { key: "members.delete", label: "Deactivate, Blacklist & Delete Members", category: "Members" },
  { key: "customers.view", label: "View Customers List", category: "Customers" },
  { key: "customers.create", label: "Register New Customers", category: "Customers" },
  { key: "customers.delete", label: "Blacklist & Delete Customers", category: "Customers" },
  { key: "customers.transfer", label: "Transfer Customer Referrals", category: "Customers" },
  { key: "settings.manage", label: "Manage System Settings & Permissions", category: "Settings" },
];

export type Permission = (typeof ALL_PERMISSIONS)[number]["key"];

import { cache } from "react";

/** Permissions a PC does not get unless the MD ticks them on in Settings. */
export const PC_RESTRICTED_DEFAULTS = [
  "settings.manage",
  "customers.transfer",
  "customers.delete",
  "members.delete",
  "projects.create",
  "projects.delete",
  "plots.delete",
];

/** Cached role permissions set per request */
export const getRolePermissions = cache(async (role: Role): Promise<Set<string>> => {
  if (role === "MD") {
    return new Set(ALL_PERMISSIONS.map((p) => p.key));
  }
  /* Deliberately not wrapped in a try/catch: if the permission table cannot be
     read we must not guess a permissive default. Every caller needs the same
     database anyway, so a read failure here is a hard failure, not a reason to
     hand a PC more access than the MD configured. */
  const db = await getDb();
  const rows = await db.role_permissions.findMany({
    where: { role, allowed: 1 },
    select: { permission: true },
  });
  return new Set(rows.map((r) => r.permission));
});

/** Checks dynamic permission in the DB role_permissions table. */
export async function can(role: Role, permission: string): Promise<boolean> {
  if (role === "MD") return true;
  const allowedSet = await getRolePermissions(role);
  return allowedSet.has(permission);
}

/** Fetches full permission matrix for MD & PC for the settings checkbox UI. */
export async function getRolePermissionsMatrix(): Promise<{
  permission: string;
  label: string;
  category: string;
  mdAllowed: boolean;
  pcAllowed: boolean;
}[]> {
  const db = await getDb();
  const rows = await db.role_permissions.findMany();

  const permMap: Record<string, { MD: boolean; PC: boolean }> = {};

  for (const row of rows) {
    const role = String(row.role);
    const perm = String(row.permission);
    const allowed = Number(row.allowed) === 1;
    if (!permMap[perm]) permMap[perm] = { MD: true, PC: true };
    if (role === "MD" || role === "PC") permMap[perm][role] = allowed;
  }

  return ALL_PERMISSIONS.map((item) => ({
    permission: item.key,
    label: item.label,
    category: item.category,
    mdAllowed: permMap[item.key]?.MD ?? true,
    pcAllowed: permMap[item.key]?.PC ?? !PC_RESTRICTED_DEFAULTS.includes(item.key),
  }));
}

/** Toggle a permission for a role in the DB. */
export async function toggleRolePermission(role: Role, permission: string, allowed: boolean): Promise<void> {
  const db = await getDb();
  await db.role_permissions.upsert({
    where: {
      role_permission: { role, permission },
    },
    update: { allowed: allowed ? 1 : 0 },
    create: { role, permission, allowed: allowed ? 1 : 0 },
  });
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

/** Guards a page or server action behind a capability. */
export async function requirePermission(
  permission: string,
): Promise<SessionUser> {
  const user = await requireUser();
  const allowed = await can(user.role, permission);
  if (!allowed) redirect("/dashboard?denied=" + permission);
  return user;
}

/** Throws instead of redirecting — for use inside server actions. */
export async function assertPermission(
  permission: string,
): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new Error("Not authenticated");
  const allowed = await can(user.role, permission);
  if (!allowed) {
    throw new Error(`Role ${user.role} is not permitted to ${permission}`);
  }
  return user;
}

