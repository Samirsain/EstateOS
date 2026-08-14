/**
 * One-off cleanup for plots duplicated by the old seeding paths.
 *
 * Two seeders (the page-load `ensureMockupPlots` and the `/api/seed-mockups`
 * route) each inserted the same plot list, and nothing stopped them: `plots`
 * had no unique constraint on (project_id, plot_number). Where both copies got
 * sold, Sales History showed the same plot twice.
 *
 * Keeps the lowest id of each duplicate group and removes the rest along with
 * their allotments, then corrects each project's total_plots.
 *
 *   npx tsx scripts/dedupe-plots.ts          # dry run, prints the plan
 *   npx tsx scripts/dedupe-plots.ts --apply  # performs the deletion
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

async function main() {
  const groups = await prisma.$queryRaw<
    { project_id: number; plot_number: string }[]
  >`SELECT project_id, plot_number FROM plots
    GROUP BY project_id, plot_number HAVING COUNT(*) > 1`;

  if (groups.length === 0) {
    console.log("No duplicate plots found.");
    return;
  }

  const doomed: number[] = [];

  for (const g of groups) {
    const rows = await prisma.plots.findMany({
      where: { project_id: g.project_id, plot_number: g.plot_number },
      include: { allotment: true, project: { select: { name: true } } },
      orderBy: { id: "asc" },
    });

    const [keep, ...remove] = rows;
    console.log(`\n${keep.project.name} / ${g.plot_number}`);
    console.log(`  keep   id=${keep.id} ${keep.plot_code} (${keep.status})`);
    for (const r of remove) {
      console.log(
        `  remove id=${r.id} ${r.plot_code} (${r.status})` +
          (r.allotment ? ` + allotment ${r.allotment.allotment_code}` : ""),
      );
      doomed.push(r.id);
    }
  }

  console.log(
    `\n${doomed.length} duplicate plot row(s) across ${groups.length} group(s).`,
  );

  if (!APPLY) {
    console.log("Dry run — re-run with --apply to delete them.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.plot_allotments.deleteMany({ where: { plot_id: { in: doomed } } });
    await tx.plots.deleteMany({ where: { id: { in: doomed } } });

    /* total_plots drifted while the duplicates existed; recount rather than
       decrement so it is correct regardless of what happened before. */
    const projects = await tx.projects.findMany({ select: { id: true } });
    for (const project of projects) {
      const total = await tx.plots.count({ where: { project_id: project.id } });
      await tx.projects.update({
        where: { id: project.id },
        data: { total_plots: total },
      });
    }
  });

  console.log(`Deleted ${doomed.length} duplicate plot row(s); project counts recounted.`);
}

main()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
