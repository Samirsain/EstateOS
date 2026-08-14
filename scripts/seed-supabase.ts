/**
 * Seeds the Supabase PostgreSQL database with:
 *  - MD admin user (md / ChangeMe@123)
 *  - Default role_permissions
 *
 * Run with: npx tsx scripts/seed-supabase.ts
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

// Keep in step with ALL_PERMISSIONS / PC_RESTRICTED_DEFAULTS in src/lib/auth.ts.
const ALL_PERMISSIONS = [
  "dashboard.view",
  "plots.view",
  "plots.create",
  "plots.delete",
  "projects.create",
  "projects.delete",
  "plots.allot",
  "members.view",
  "members.create",
  "members.edit",
  "members.delete",
  "customers.view",
  "customers.create",
  "customers.delete",
  "customers.transfer",
  "settings.manage",
];

// Permissions PC should NOT have by default
const PC_RESTRICTED = new Set([
  "settings.manage",
  "customers.transfer",
  "customers.delete",
  "members.delete",
  "projects.create",
  "projects.delete",
  "plots.delete",
]);

async function main() {
  console.log("🚀 Seeding Supabase PostgreSQL...\n");

  // ── 1. MD user ──────────────────────────────────────────────────────────────
  const mdPassword = process.env.CMMS_MD_PASSWORD ?? "ChangeMe@123";

  const existingMd = await prisma.users.findFirst({
    where: { role: "MD" },
  });

  if (existingMd) {
    console.log(`✅ MD user already exists (username: ${existingMd.username})`);
  } else {
    await prisma.users.create({
      data: {
        username: "md",
        name: "Managing Director",
        role: "MD",
        password_hash: hashPassword(mdPassword),
        is_active: 1,
      },
    });
    console.log(`✅ MD user created  →  md / ${mdPassword}`);
  }

  // ── 2. Default role_permissions ──────────────────────────────────────────────
  let permCount = 0;
  for (const perm of ALL_PERMISSIONS) {
    for (const role of ["MD", "PC"] as const) {
      const allowed = role === "MD" ? 1 : PC_RESTRICTED.has(perm) ? 0 : 1;
      await prisma.role_permissions.upsert({
        where: { role_permission: { role, permission: perm } },
        update: {},        // don't overwrite if already customised
        create: { role, permission: perm, allowed },
      });
      permCount++;
    }
  }
  console.log(`✅ ${permCount} role_permission rows seeded`);

  // ── 3. id_sequences baseline ─────────────────────────────────────────────────
  const prefixes = ["TM", "3C", "PLT", "ALT", "PRJ"];
  for (const prefix of prefixes) {
    await prisma.id_sequences.upsert({
      where: { prefix },
      update: {},
      create: { prefix, last_seq: 0 },
    });
  }
  console.log(`✅ id_sequences initialised for: ${prefixes.join(", ")}`);

  console.log("\n🎉 Done! Login with:  md / " + mdPassword);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
