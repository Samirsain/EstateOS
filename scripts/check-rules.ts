/**
 * Self-check for the three business rules that carry money and liability:
 * commission slots, the royalty milestone, and the blacklist engine.
 *
 * Runs against the configured database inside a transaction that is always
 * rolled back, so it leaves no rows behind.
 *
 *   npx tsx scripts/check-rules.ts
 */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Unique-per-run suffix so repeated runs never collide on unique columns. */
const RUN = Date.now().toString().slice(-6);

class Rollback extends Error {}

async function main() {
  let failures = 0;
  const pass = (name: string) => console.log(`  ✓ ${name}`);
  const fail = (name: string, err: unknown) => {
    failures++;
    console.error(`  ✗ ${name}\n    ${err instanceof Error ? err.message : err}`);
  };

  console.log("Checking business rules (all writes rolled back)...\n");

  // ── Measurement conversions (pure, no database) ───────────────────────────
  try {
    const { areaBreakdown, sqftFromDimensions, ratePerSqft } = await import(
      "../src/lib/measure"
    );

    const plot = { width_ft: 30, length_ft: 40, size_sqft: 999 };
    const area = areaBreakdown(plot);

    // Dimensions win over a stale stored size.
    assert.equal(area.sqft, 1200, "30 x 40 must be 1200 sq.ft, not the stored 999");
    assert.equal(area.derived, true, "area must be flagged as derived");
    assert.equal(area.dimensions, "30 × 40 ft");

    // 1 sq.yd = 9 sq.ft exactly.
    assert.equal(Math.round(area.gaj * 1000) / 1000, 133.333);
    // 1 ft = 0.3048 m, so 1200 sq.ft = 111.4836 sq.m.
    assert.equal(Math.round(area.sqm * 10000) / 10000, 111.4836);
    // 1 acre = 43,560 sq.ft.
    assert.equal(areaBreakdown({ size_sqft: 43560 }).acre, 1);

    // Without both dimensions the stored area is used unchanged.
    const irregular = areaBreakdown({ width_ft: 30, length_ft: null, size_sqft: 999 });
    assert.equal(irregular.sqft, 999, "a missing dimension must fall back to size_sqft");
    assert.equal(irregular.derived, false);
    assert.equal(irregular.dimensions, null);

    assert.equal(sqftFromDimensions(0, 40), null, "zero width is not a dimension");
    assert.equal(ratePerSqft(1800000, 0), 0, "rate must not divide by zero");
    assert.equal(ratePerSqft(1800000, 1200), 1500);

    pass("measurement conversions (sq.ft / sq.yd / sq.m from W x L)");
  } catch (err) {
    fail("measurement conversions (sq.ft / sq.yd / sq.m from W x L)", err);
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // The engines take the shared client, so point them at the transaction
        // for the duration of this check.
        const { recalcCommissionEligibility, countVerifiedCustomerSales } =
          await import("../src/lib/referrals");
        const { normaliseName } = await import("../src/lib/blacklist");
        const { blindIndex } = await import("../src/lib/crypto");

        /* `9` + 6-digit run id + 3-digit sequence = a unique 10-digit mobile,
           so repeated runs never collide on the unique columns. */
        const handle = (seq: number) => ({
          code: `T${RUN}${String(seq).padStart(3, "0")}`,
          mobile: `9${RUN}${String(seq).padStart(3, "0")}`,
        });

        const mkMember = async (name: string, seq: number, parent?: number) => {
          const { code, mobile } = handle(seq);
          return tx.members.create({
            data: {
              member_code: code,
              name,
              mobile,
              aadhaar_encrypted: "x",
              aadhaar_index: `idx-${RUN}-${seq}`,
              aadhaar_last4: mobile.slice(-4),
              invite_code: code,
              referred_by_member_id: parent ?? null,
            },
          });
        };

        // ── Rule 1: only the first 3 referrals by created_at hold slots ──────
        const parent = await mkMember("PARENT", 0);
        const children = [];
        for (let i = 1; i <= 5; i++) {
          children.push(await mkMember(`CHILD ${i}`, i, parent.id));
        }

        await recalcCommissionEligibility(parent.id, tx);
        const after = await tx.members.findMany({
          where: { referred_by_member_id: parent.id },
          orderBy: [{ created_at: "asc" }, { id: "asc" }],
          select: { is_commission_eligible: true },
        });

        try {
          assert.deepEqual(
            after.map((c) => c.is_commission_eligible),
            [true, true, true, false, false],
            "first three referrals must be eligible, the rest lineage-only",
          );
          pass("first-3 commission slots");
        } catch (err) {
          fail("first-3 commission slots", err);
        }

        // Freeing an early slot must promote the next sibling.
        try {
          await tx.members.delete({ where: { id: children[0].id } });
          await recalcCommissionEligibility(parent.id, tx);
          const promoted = await tx.members.findMany({
            where: { referred_by_member_id: parent.id },
            orderBy: [{ created_at: "asc" }, { id: "asc" }],
            select: { is_commission_eligible: true },
          });
          assert.deepEqual(
            promoted.map((c) => c.is_commission_eligible),
            [true, true, true, false],
            "deleting an eligible referral promotes the next in line",
          );
          pass("slot freed by deletion is reassigned");
        } catch (err) {
          fail("slot freed by deletion is reassigned", err);
        }

        // ── Rule 2: royalty counts purchases, not registrations ─────────────
        try {
          const project = await tx.projects.create({
            data: { code: `TP${RUN}`, name: `T ${RUN}`, location: "T" },
          });

          for (let i = 1; i <= 5; i++) {
            const customer = await tx.customers.create({
              data: {
                customer_code: `TC${RUN}${i}`,
                name: `BUYER ${i}`,
                mobile: `8${RUN}${String(i).padStart(3, "0")}`,
                customer_type: "User",
                aadhaar_encrypted: "x",
                aadhaar_index: `cidx-${RUN}-${i}`,
                aadhaar_last4: "0000",
                member_id: parent.id,
              },
            });

            // Only the first three actually buy a plot.
            if (i > 3) continue;

            const plot = await tx.plots.create({
              data: {
                plot_code: `TPL${RUN}${i}`,
                project_id: project.id,
                plot_number: `T-${i}`,
                size_sqft: 1000,
                rate_per_sqft: 1000,
                total_price: 1000000,
              },
            });
            await tx.plot_allotments.create({
              data: {
                allotment_code: `TA${RUN}${i}`,
                plot_id: plot.id,
                customer_id: customer.id,
                member_id: parent.id,
                agreed_price: 1000000,
                booking_amount: 1000000,
              },
            });
          }

          const verified = await countVerifiedCustomerSales(parent.id, tx);
          assert.equal(
            verified,
            3,
            `five registered customers but three purchases must count as 3, got ${verified}`,
          );
          pass("royalty counts completed purchases only");
        } catch (err) {
          fail("royalty counts completed purchases only", err);
        }

        // ── Rule 3: blacklist matches on all three identity factors ─────────
        try {
          const aadhaar = "234567890123";
          await tx.blacklist_registry.create({
            data: {
              entity_type: "CUSTOMER",
              entity_id: 999999,
              entity_code: `TB${RUN}`,
              name: "Fraud  Person",
              name_normalised: normaliseName("Fraud  Person"),
              mobile: "9999900001",
              aadhaar_index: blindIndex(aadhaar),
              city: normaliseName("Jaipur"),
              reason: "test",
            },
          });

          const byMobile = await tx.blacklist_registry.count({
            where: { mobile: "9999900001" },
          });
          assert.equal(byMobile, 1, "mobile factor must match");

          const byAadhaar = await tx.blacklist_registry.count({
            where: { aadhaar_index: blindIndex(aadhaar) },
          });
          assert.equal(byAadhaar, 1, "Aadhaar blind-index factor must match");

          const byNameCity = await tx.blacklist_registry.count({
            where: {
              name_normalised: normaliseName("FRAUD PERSON"),
              city: normaliseName("JAIPUR"),
            },
          });
          assert.equal(
            byNameCity,
            1,
            "name+city must match regardless of case and extra spacing",
          );

          const wrongAadhaar = await tx.blacklist_registry.count({
            where: { aadhaar_index: blindIndex("234567890124") },
          });
          assert.equal(wrongAadhaar, 0, "a different Aadhaar must not match");

          pass("blacklist matches mobile, Aadhaar hash and name+city");
        } catch (err) {
          fail("blacklist matches mobile, Aadhaar hash and name+city", err);
        }

        throw new Rollback();
      },
      { timeout: 30000 },
    );
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }

  console.log(
    failures === 0
      ? "\n✅ All rule checks passed (test data rolled back)."
      : `\n❌ ${failures} rule check(s) failed.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().finally(() => prisma.$disconnect());
