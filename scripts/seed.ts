/**
 * Seeds demo data for local development and screenshots.
 *
 *   npm run seed
 *
 * Safe to re-run: it exits without changes if members already exist.
 * Imports the application's own modules so generated IDs, invite codes and
 * field encryption are identical to what the app produces at runtime.
 */
import { blindIndex, encryptField, generateInviteCode, hashPassword } from "../src/lib/crypto.ts";
import { getDb } from "../src/lib/db.ts";
import { nextCustomerCode, nextMemberCode } from "../src/lib/ids.ts";

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/** Builds a 12-digit Aadhaar-shaped number with a valid Verhoeff check digit. */
function makeAadhaar(seed: number): string {
  const base = String(200000000000 + seed * 137).slice(0, 11);
  let checksum = 0;
  const reversed = `${base}0`.split("").reverse();
  for (let i = 0; i < reversed.length; i += 1) {
    checksum = VERHOEFF_D[checksum][VERHOEFF_P[i % 8][Number(reversed[i])]];
  }
  return base + VERHOEFF_INV[checksum];
}

const MEMBERS = [
  { name: "Rajesh Kumar", dealer: "Kumar Properties", city: "Jaipur", company: "Kumar Realty", deals: ["Residential", "Commercial"], exp: "5-10 years" },
  { name: "Priya Sharma", dealer: "Sharma Estates", city: "Jaipur", company: "Sharma Estates LLP", deals: ["Residential", "Rental"], exp: "3-5 years" },
  { name: "Amit Patel", dealer: "Patel Land Co", city: "Ahmedabad", company: "Patel Land Company", deals: ["Agriculture", "Commercial"], exp: "More than 10 years" },
  { name: "Sunita Verma", dealer: "Verma Associates", city: "Udaipur", company: "Verma Associates", deals: ["Residential"], exp: "1-3 years" },
  { name: "Mohammed Iqbal", dealer: "Iqbal Realtors", city: "Kota", company: "Iqbal Realtors", deals: ["Commercial", "Rental"], exp: "5-10 years" },
  { name: "Deepak Joshi", dealer: "Joshi Brothers", city: "Ajmer", company: "Joshi Brothers Pvt Ltd", deals: ["Residential", "Agriculture", "Rental"], exp: "3-5 years" },
];

const CUSTOMER_NAMES = [
  "Anil Gupta", "Kavita Singh", "Ramesh Yadav", "Neha Agarwal", "Vikram Rathore",
  "Pooja Mehta", "Sanjay Bansal", "Meena Chauhan", "Arjun Nair", "Divya Saxena",
  "Harish Malhotra", "Ritu Kapoor", "Naveen Reddy", "Shalini Bose", "Manoj Tiwari",
  "Anita Desai", "Rohit Khanna", "Swati Pandey", "Gaurav Chopra", "Nisha Bhatt",
  "Karan Mishra", "Lakshmi Iyer", "Suresh Rawat", "Preeti Dubey", "Vinod Solanki",
  "Rekha Jain",
];

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function dateOf(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  const db = await getDb();

  const existingResult = await db.execute("SELECT COUNT(*) AS count FROM members");
  const existingCount = Number(existingResult.rows[0]?.count ?? 0);

  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} members — nothing to seed.`);
    return;
  }

  const mdResult = await db.execute(
    "SELECT * FROM users WHERE role = 'MD' LIMIT 1",
  );
  const md = mdResult.rows[0] as unknown as { id: number };

  /* The MD creates the PC account (PRD §5, step 1). */
  const pcUsername = "pc";
  const pcPassword = "Office@123";

  const pcExistsResult = await db.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: [pcUsername],
  });
  const pcExists = pcExistsResult.rows[0] as unknown as { id: number } | undefined;

  let pcId: number;
  if (pcExists) {
    pcId = pcExists.id;
  } else {
    const insertResult = await db.execute({
      sql: `INSERT INTO users (username, name, role, password_hash, created_by)
            VALUES (?, ?, 'PC', ?, ?)`,
      args: [pcUsername, "Office Coordinator", hashPassword(pcPassword), md.id],
    });
    pcId = Number(insertResult.lastInsertRowid);
  }

  await db.execute({
    sql: `INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, entity, entity_ref)
          VALUES (?, 'Managing Director', 'MD', 'user.created', 'user', ?)`,
    args: [md.id, pcUsername],
  });

  const memberIds: number[] = [];

  for (const [index, member] of MEMBERS.entries()) {
    const registeredDaysAgo = 28 - index * 4;
    const code = await nextMemberCode(db, dateOf(registeredDaysAgo));
    const aadhaar = makeAadhaar(index + 1);

    const result = await db.execute({
      sql: `INSERT INTO members (
              member_code, name, dealer_name, mobile, alternate_mobile, city,
              company_name, deals_in, experience, aadhaar_encrypted, aadhaar_index,
              aadhaar_last4, invite_code, created_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        code,
        member.name,
        member.dealer,
        `98${String(10000000 + index * 111111).slice(0, 8)}`,
        index % 2 === 0 ? `97${String(20000000 + index * 222222).slice(0, 8)}` : null,
        member.city,
        member.company,
        JSON.stringify(member.deals),
        member.exp,
        encryptField(aadhaar),
        blindIndex(aadhaar),
        aadhaar.slice(-4),
        generateInviteCode(),
        daysAgo(registeredDaysAgo),
        pcId,
      ],
    });

    memberIds.push(Number(result.lastInsertRowid));

    await db.execute({
      sql: `INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, entity, entity_ref, created_at)
            VALUES (?, 'Office Coordinator', 'PC', 'member.created', 'member', ?, ?)`,
      args: [pcId, code, daysAgo(registeredDaysAgo)],
    });
  }

  for (const [index, name] of CUSTOMER_NAMES.entries()) {
    /* Weight referrals so the "top performing members" chart has a real shape. */
    const memberIndex =
      index % 9 === 0 ? 0 : index % 5 === 0 ? 1 : index % 3 === 0 ? 2 : index % 6;
    const memberRowResult = await db.execute({
      sql: "SELECT id, invite_code FROM members WHERE id = ?",
      args: [memberIds[Math.min(memberIndex, memberIds.length - 1)]],
    });
    const memberRow = memberRowResult.rows[0] as unknown as {
      id: number;
      invite_code: string;
    };

    const registeredDaysAgo = Math.max(0, 24 - Math.floor(index * 0.95));
    const code = await nextCustomerCode(db, dateOf(registeredDaysAgo));
    const aadhaar = makeAadhaar(index + 100);

    await db.execute({
      sql: `INSERT INTO customers (
              customer_code, name, mobile, customer_type, aadhaar_encrypted,
              aadhaar_index, aadhaar_last4, member_id, invite_code, created_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        code,
        name,
        `9${String(100000000 + index * 1234567).slice(0, 9)}`,
        index % 4 === 0 ? "Investor" : "User",
        encryptField(aadhaar),
        blindIndex(aadhaar),
        aadhaar.slice(-4),
        memberRow.id,
        memberRow.invite_code,
        daysAgo(registeredDaysAgo),
        pcId,
      ],
    });

    await db.execute({
      sql: `INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, entity, entity_ref, created_at)
            VALUES (?, 'Office Coordinator', 'PC', 'customer.created', 'customer', ?, ?)`,
      args: [pcId, code, daysAgo(registeredDaysAgo)],
    });
  }

  /* A couple of blocked duplicate attempts so the dashboard card is meaningful. */
  const firstCustomerResult = await db.execute(
    "SELECT customer_code, mobile, aadhaar_last4 FROM customers LIMIT 1",
  );
  const firstCustomer = firstCustomerResult.rows[0] as unknown as {
    customer_code: string;
    mobile: string;
    aadhaar_last4: string;
  };

  await db.execute({
    sql: `INSERT INTO duplicate_attempts (field, entity, masked_value, existing_code, attempted_name, attempted_by, created_at)
          VALUES ('mobile', 'customer', ?, ?, 'Anil Gupta', ?, ?)`,
    args: [firstCustomer.mobile, firstCustomer.customer_code, pcId, daysAgo(3)],
  });

  await db.execute({
    sql: `INSERT INTO duplicate_attempts (field, entity, masked_value, existing_code, attempted_name, attempted_by, created_at)
          VALUES ('aadhaar', 'customer', ?, ?, 'A. Gupta', ?, ?)`,
    args: [
      `XXXX XXXX ${firstCustomer.aadhaar_last4}`,
      firstCustomer.customer_code,
      pcId,
      daysAgo(1),
    ],
  });

  console.log("Seeded demo data.");
  console.log(`  MD login: md / ${process.env.CMMS_MD_PASSWORD ?? "ChangeMe@123"}`);
  console.log(`  PC login: ${pcUsername} / ${pcPassword}`);
  console.log(`  ${MEMBERS.length} members, ${CUSTOMER_NAMES.length} customers.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
