/**
 * Resets a user's password directly in the database, bypassing the app's
 * login-gated "Reset password" form in Settings. Use this when the MD
 * account itself is locked out and nobody can sign in to reset it.
 *
 *   DATABASE_URL=... npx tsx scripts/reset-password.ts <username> <new-password>
 *
 * Run it against the same DATABASE_URL your production deployment uses.
 */
import { hashPassword } from "../src/lib/crypto.ts";
import { getDb } from "../src/lib/db.ts";

async function main() {
  const [username, password] = process.argv.slice(2);

  if (!username || !password) {
    console.error("Usage: npx tsx scripts/reset-password.ts <username> <new-password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const db = await getDb();
  const user = await db.users.findUnique({ where: { username } });
  if (!user) {
    console.error(`No user found with username "${username}".`);
    process.exit(1);
  }

  await db.users.update({
    where: { username },
    data: { password_hash: hashPassword(password), is_active: 1 },
  });

  console.log(`Password reset for "${username}". They can now sign in with the new password.`);
  process.exit(0);
}

main();
