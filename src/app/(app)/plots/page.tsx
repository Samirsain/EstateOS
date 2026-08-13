import type { Metadata } from "next";
import { Card, PageHeader, LinkButton } from "@/components/ui";
import { can, requirePermission } from "@/lib/auth";
import {
  listActiveMembersForSelect,
  listCustomers,
  listPlotAllotments,
  listPlots,
  listProjects,
  getDashboardStats,
} from "@/lib/queries";
import { PlotsManager } from "./plots-manager";

export const metadata: Metadata = { title: "Plots Inventory & Allotment" };
export const dynamic = "force-dynamic";

export default async function PlotsPage() {
  const user = await requirePermission("plots.view");

  const [plots, projects, allotments, customers, members] = await Promise.all([
    listPlots(),
    listProjects(),
    listPlotAllotments(),
    listCustomers(),
    listActiveMembersForSelect(),
  ]);

  const totalPlots = plots.length;
  let availablePlots = 0;
  let holdPlots = 0;
  let allottedPlots = 0;
  let totalInventoryValue = 0;

  for (const p of plots) {
    totalInventoryValue += p.total_price || 0;
    if (p.status === "Available") availablePlots++;
    else if (p.status === "Hold") holdPlots++;
    else allottedPlots++;
  }

  const stats = {
    totalPlots,
    availablePlots,
    holdPlots,
    allottedPlots,
    totalInventoryValue,
  };

  const [canCreatePlot, canDeletePlot, canCreateProject, canDeleteProject, canAllotPlot] = await Promise.all([
    can(user.role, "plots.create"),
    can(user.role, "plots.delete"),
    can(user.role, "projects.create"),
    can(user.role, "projects.delete"),
    can(user.role, "plots.allot"),
  ]);

  const availablePct = stats.totalPlots > 0 ? Math.round((stats.availablePlots / stats.totalPlots) * 100) : 0;
  const allottedPct = stats.totalPlots > 0 ? Math.round((stats.allottedPlots / stats.totalPlots) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Plot Inventory & Allotment"
        description="Real-time layout inventory tracking, plot status control, and buyer allotments."
        action={canCreatePlot ? <LinkButton href="#add-plot">+ Add Plot</LinkButton> : undefined}
      />

      {/* Stats Strip — compact */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Total Plots</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalPlots}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500">Available</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600">{stats.availablePlots}</p>
          <p className="mt-0.5 text-[11px] text-emerald-400">{availablePct}% of inventory</p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">On Hold</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">{stats.holdPlots}</p>
          <p className="mt-0.5 text-[11px] text-amber-400">Reserved / Pending</p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-500">Allotted</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{stats.allottedPlots}</p>
          <p className="mt-0.5 text-[11px] text-blue-400">{allottedPct}% sold</p>
        </div>
      </div>


      {/* Main Manager View */}
      <PlotsManager
        initialPlots={JSON.parse(JSON.stringify(plots))}
        projects={JSON.parse(JSON.stringify(projects))}
        allotments={JSON.parse(JSON.stringify(allotments))}
        customers={customers.map((c) => ({ id: c.id, customer_code: c.customer_code, name: c.name }))}
        members={members.map((m) => ({ id: m.id, member_code: m.member_code, name: m.name }))}
        canCreatePlot={canCreatePlot}
        canDeletePlot={canDeletePlot}
        canCreateProject={canCreateProject}
        canDeleteProject={canDeleteProject}
        canAllotPlot={canAllotPlot}
      />
    </>
  );
}

