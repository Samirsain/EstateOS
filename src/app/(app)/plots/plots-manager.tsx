"use client";

import * as React from "react";
import { Badge, Button, Card, CustomSelect, Table, Td, Th } from "@/components/ui";
import type { PlotAllotmentWithDetails, PlotWithDetails, ProjectRow } from "@/lib/types";
import { CreatePlotModal, CreateProjectModal, AllotPlotModal } from "./plot-modals";
import { updatePlotStatusAction, deletePlotAction, deleteProjectAction } from "./actions";

interface PlotsManagerProps {
  initialPlots: PlotWithDetails[];
  projects: ProjectRow[];
  allotments: PlotAllotmentWithDetails[];
  customers: { id: number; customer_code: string; name: string }[];
  members: { id: number; member_code: string; name: string }[];
  canCreatePlot: boolean;
  canDeletePlot?: boolean;
  canCreateProject: boolean;
  canDeleteProject?: boolean;
  canAllotPlot: boolean;
}

export function PlotsManager({
  initialPlots,
  projects,
  allotments,
  customers,
  members,
  canCreatePlot,
  canDeletePlot = true,
  canCreateProject,
  canDeleteProject = true,
  canAllotPlot,
}: PlotsManagerProps) {
  const [activeTab, setActiveTab] = React.useState<"grid" | "table" | "projects" | "allotments">("grid");
  const [search, setSearch] = React.useState("");
  const [selectedProject, setSelectedProject] = React.useState<string>("all");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [feedback, setFeedback] = React.useState<{ ok?: boolean; message?: string } | null>(null);

  const [projectModalOpen, setProjectModalOpen] = React.useState(false);
  const [plotModalOpen, setPlotModalOpen] = React.useState(false);
  const [allotModalOpen, setAllotModalOpen] = React.useState(false);
  const [selectedPlotForBooking, setSelectedPlotForBooking] = React.useState<PlotWithDetails | null>(null);

  const filteredPlots = React.useMemo(() => {
    return initialPlots.filter((plot) => {
      const matchesSearch =
        search === "" ||
        plot.plot_number.toLowerCase().includes(search.toLowerCase()) ||
        plot.plot_code.toLowerCase().includes(search.toLowerCase()) ||
        (plot.block && plot.block.toLowerCase().includes(search.toLowerCase())) ||
        plot.project_name.toLowerCase().includes(search.toLowerCase());

      const matchesProject =
        selectedProject === "all" || plot.project_id === Number(selectedProject);

      const matchesStatus =
        selectedStatus === "all" || plot.status === selectedStatus;

      const matchesType =
        selectedType === "all" || (plot.plot_type || "Residential") === selectedType;

      return matchesSearch && matchesProject && matchesStatus && matchesType;
    });
  }, [initialPlots, search, selectedProject, selectedStatus, selectedType]);

  const handleToggleHold = async (plot: PlotWithDetails) => {
    const newStatus = plot.status === "Hold" ? "Available" : "Hold";
    const res = await updatePlotStatusAction(plot.id, newStatus);
    if (res.message) setFeedback(res);
  };

  const handleDeletePlot = async (plot: PlotWithDetails) => {
    if (!confirm(`Are you sure you want to delete plot ${plot.plot_number} (${plot.plot_code})?`)) return;
    const res = await deletePlotAction(plot.id);
    setFeedback(res);
  };

  const handleDeleteProject = async (prj: ProjectRow) => {
    if (!confirm(`Are you sure you want to delete project "${prj.name}"?`)) return;
    const res = await deleteProjectAction(prj.id);
    setFeedback(res);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Available":
        return <Badge tone="positive">Available</Badge>;
      case "Hold":
        return <Badge tone="warning">On Hold</Badge>;
      case "Booked":
      case "Allotted":
        return <Badge tone="brand">Allotted</Badge>;
      default:
        return <Badge tone="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-sm font-medium flex items-center justify-between border ${
            feedback.ok
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Control Bar & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation Tabs — Apple Pill Segmented */}
        <div className="flex items-center rounded-full bg-[#f5f5f7] p-1 text-xs font-medium border border-[#e0e0e0]">
          <button
            onClick={() => setActiveTab("grid")}
            className={`rounded-full px-3.5 py-1 transition-all ${
              activeTab === "grid" ? "bg-white text-[#1d1d1f] shadow-sm font-semibold" : "text-[#7a7a7a] hover:text-[#1d1d1f]"
            }`}
          >
            Visual Grid View
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`rounded-full px-3.5 py-1 transition-all ${
              activeTab === "table" ? "bg-white text-[#1d1d1f] shadow-sm font-semibold" : "text-[#7a7a7a] hover:text-[#1d1d1f]"
            }`}
          >
            Plots List ({filteredPlots.length})
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`rounded-full px-3.5 py-1 transition-all ${
              activeTab === "projects" ? "bg-white text-[#1d1d1f] shadow-sm font-semibold" : "text-[#7a7a7a] hover:text-[#1d1d1f]"
            }`}
          >
            Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("allotments")}
            className={`rounded-full px-3.5 py-1 transition-all ${
              activeTab === "allotments" ? "bg-white text-[#1d1d1f] shadow-sm font-semibold" : "text-[#7a7a7a] hover:text-[#1d1d1f]"
            }`}
          >
            Allotment History ({allotments.length})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canCreateProject && (
            <Button variant="secondary" onClick={() => setProjectModalOpen(true)}>
              + New Project
            </Button>
          )}
          {canCreatePlot && (
            <Button variant="secondary" onClick={() => setPlotModalOpen(true)}>
              + Add Plot
            </Button>
          )}
          {canAllotPlot && (
            <Button variant="primary" onClick={() => { setSelectedPlotForBooking(null); setAllotModalOpen(true); }}>
              + Allot Plot
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar for Plot Views */}
      {(activeTab === "grid" || activeTab === "table") && (
        <Card className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] mb-1">Search Plot Number / Code</label>
              <input
                type="text"
                placeholder="Search plot A-101, PLT0001..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-[#e0e0e0] bg-white px-3.5 py-1.5 text-xs text-[#1d1d1f] placeholder:text-[#a1a1a6] focus:border-[#0066cc] focus:outline-none focus:ring-2 focus:ring-[#0066cc]/20 transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] mb-1">Filter Project</label>
              <CustomSelect
                value={selectedProject}
                onChange={setSelectedProject}
                options={[
                  { value: "all", label: "All Projects" },
                  ...projects.map((p) => ({ value: String(p.id), label: p.name })),
                ]}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] mb-1">Filter Category</label>
              <CustomSelect
                value={selectedType}
                onChange={setSelectedType}
                options={[
                  { value: "all", label: "All Categories" },
                  { value: "Residential", label: "Residential" },
                  { value: "Commercial", label: "Commercial" },
                  { value: "Agriculture", label: "Agriculture / Farmland" },
                ]}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] mb-1">Filter Status</label>
              <CustomSelect
                value={selectedStatus}
                onChange={setSelectedStatus}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "Available", label: "Available" },
                  { value: "Hold", label: "On Hold" },
                  { value: "Allotted", label: "Allotted / Booked" },
                ]}
              />
            </div>
          </div>
        </Card>
      )}

      {/* TAB 1: VISUAL GRID VIEW */}
      {activeTab === "grid" && (
        <div className="space-y-3">
          <p className="text-xs text-ink-muted">{filteredPlots.length} plot{filteredPlots.length !== 1 ? "s" : ""} found</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPlots.map((plot) => {
              const typeBg =
                (plot.plot_type || "Residential") === "Commercial"
                  ? "bg-purple-50 text-purple-600 border-purple-100"
                  : (plot.plot_type || "Residential") === "Agriculture"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-sky-50 text-sky-600 border-sky-100";
              const cardBorder =
                plot.status === "Available"
                  ? "border-gray-200"
                  : plot.status === "Hold"
                  ? "border-amber-200"
                  : "border-brand-200";

              return (
                <div
                  key={plot.id}
                  className={`flex flex-col rounded-[18px] border bg-white p-4 transition-all hover:border-[#0066cc]/40 hover:shadow-sm ${cardBorder}`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-[#1d1d1f] tracking-tight-apple">{plot.plot_number}</span>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${typeBg}`}>
                          {plot.plot_type || "Residential"}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-[#7a7a7a]">
                        {plot.plot_code}{plot.block ? ` · ${plot.block}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {getStatusBadge(plot.status)}
                      {plot.status !== "Allotted" && canDeletePlot && (
                        <button
                          onClick={() => handleDeletePlot(plot)}
                          title="Delete"
                          className="rounded-full p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Project & Details */}
                  <div className="mt-2.5 space-y-0.5">
                    <p className="text-xs font-semibold text-[#0066cc] truncate">{plot.project_name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[#7a7a7a]">
                      <span>{plot.size_sqft.toLocaleString("en-IN")} sq.ft</span>
                      <span className="text-[#e0e0e0]">·</span>
                      <span>₹{plot.rate_per_sqft.toLocaleString("en-IN")}/sqft</span>
                      {plot.facing && (
                        <>
                          <span className="text-[#e0e0e0]">·</span>
                          <span>{plot.facing}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Buyer info */}
                  {plot.customer_name && (
                    <div className="mt-2.5 rounded-xl bg-[#f5f5f7] px-2.5 py-1.5 text-[11px] space-y-0.5 border border-[#e0e0e0]/60">
                      <p className="font-medium text-[#1d1d1f] truncate">
                        Buyer: <span className="font-semibold">{plot.customer_name}</span>
                        {plot.customer_code ? <span className="ml-1 text-[10px] text-[#7a7a7a] tabular font-normal">({plot.customer_code})</span> : null}
                      </p>
                      <p className="text-[#7a7a7a] truncate">
                        Dealer/Member: <span className="font-medium text-[#1d1d1f]">{plot.member_name || "Direct allotment"}</span>
                        {plot.member_code ? <span className="ml-1 text-[10px] text-[#7a7a7a] tabular font-normal">({plot.member_code})</span> : null}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between border-t border-[#f0f0f0] pt-2.5">
                    <span className="text-xs font-semibold text-[#1d1d1f]">₹{plot.total_price.toLocaleString("en-IN")}</span>
                    <div className="flex items-center gap-1.5">
                      {plot.status !== "Allotted" && canCreatePlot && (
                        <button
                          onClick={() => handleToggleHold(plot)}
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/80 hover:bg-amber-100 transition-all active:scale-95"
                        >
                          {plot.status === "Hold" ? "Release" : "Hold"}
                        </button>
                      )}
                      {plot.status !== "Allotted" && canAllotPlot && (
                        <button
                          onClick={() => { setSelectedPlotForBooking(plot); setAllotModalOpen(true); }}
                          className="rounded-full px-3 py-0.5 text-[11px] font-medium text-white bg-[#0066cc] hover:bg-[#0071e3] transition-all active:scale-95 shadow-sm"
                        >
                          Allot
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* TAB 2: DETAILED TABLE VIEW */}
      {activeTab === "table" && (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Plot Code</Th>
                <Th>Plot No & Block</Th>
                <Th>Category</Th>
                <Th>Project Name</Th>
                <Th>Size (Sq.Ft)</Th>
                <Th>Total Price</Th>
                <Th>Status</Th>
                <Th>Assigned Buyer / Agent</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredPlots.map((plot) => (
                <tr key={plot.id}>
                  <Td className="font-mono text-xs font-semibold text-brand-700">{plot.plot_code}</Td>
                  <Td className="font-bold text-ink">{plot.plot_number} {plot.block ? `(${plot.block})` : ""}</Td>
                  <Td>
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                      (plot.plot_type || "Residential") === "Commercial"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : (plot.plot_type || "Residential") === "Agriculture"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {plot.plot_type || "Residential"}
                    </span>
                  </Td>
                  <Td>{plot.project_name}</Td>
                  <Td>{plot.size_sqft} sq.ft</Td>
                  <Td className="font-semibold text-ink">₹{plot.total_price.toLocaleString("en-IN")}</Td>
                  <Td>{getStatusBadge(plot.status)}</Td>
                  <Td>
                    {plot.customer_name ? (
                      <div className="text-xs">
                        <p className="font-semibold text-[#1d1d1f]">
                          {plot.customer_name}
                          {plot.customer_code ? <span className="ml-1 text-[10px] font-normal text-[#7a7a7a] tabular">({plot.customer_code})</span> : null}
                        </p>
                        <p className="text-[#7a7a7a] text-[11px]">
                          Ref: {plot.member_name || "Direct"}
                          {plot.member_code ? <span className="ml-1 text-[10px] text-[#7a7a7a] tabular">({plot.member_code})</span> : null}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-[#7a7a7a]">—</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {plot.status !== "Allotted" && canAllotPlot && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-2.5 py-1 text-xs"
                          onClick={() => { setSelectedPlotForBooking(plot); setAllotModalOpen(true); }}
                        >
                          Allot
                        </Button>
                      )}
                      {plot.status !== "Allotted" && canDeletePlot && (
                        <button
                          onClick={() => handleDeletePlot(plot)}
                          title="Delete Plot"
                          className="rounded p-1 text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition"
                        >
                          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* TAB 3: PROJECTS TAB */}
      {activeTab === "projects" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {projects.map((prj) => (
            <Card key={prj.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono text-brand-700 font-semibold">{prj.code}</span>
                  <h3 className="text-lg font-bold text-ink">{prj.name}</h3>
                  <p className="text-xs text-ink-muted">{prj.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold border ${
                    (prj.project_type || "Residential") === "Commercial"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : (prj.project_type || "Residential") === "Agriculture"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {prj.project_type || "Residential"}
                  </span>
                  <Badge tone="brand">{prj.status}</Badge>
                  {canDeleteProject && (
                    <button
                      onClick={() => handleDeleteProject(prj)}
                      title="Delete Project"
                      className="rounded p-1 text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm text-ink-muted">{prj.description || "Residential plot township."}</p>

              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-ink">
                <span>Total Registered Plots: <strong>{prj.total_plots}</strong></span>
                <span className="text-brand-600 font-medium">Active Township</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 4: ALLOTMENTS HISTORY TAB */}
      {activeTab === "allotments" && (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Allotment Code</Th>
                <Th>Plot & Project</Th>
                <Th>Customer (Buyer)</Th>
                <Th>Member (Agent)</Th>
                <Th>Allotment Date</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {allotments.map((alt) => (
                <tr key={alt.id}>
                  <Td className="font-mono text-xs font-semibold text-[#0066cc]">{alt.allotment_code}</Td>
                  <Td>
                    <p className="font-semibold text-[#1d1d1f]">{alt.plot_number} ({alt.plot_code})</p>
                    <p className="text-xs text-[#7a7a7a]">{alt.project_name}</p>
                  </Td>
                  <Td>
                    <p className="font-semibold text-[#1d1d1f]">{alt.customer_name}</p>
                    <p className="text-xs text-[#7a7a7a] tabular font-medium">Code: {alt.customer_code} · {alt.customer_mobile}</p>
                  </Td>
                  <Td>
                    <p className="font-semibold text-[#1d1d1f]">{alt.member_name || "Direct Allotment"}</p>
                    <p className="text-xs text-[#7a7a7a] tabular font-medium">Code: {alt.member_code || "—"}</p>
                  </Td>
                  <Td className="text-xs text-ink-muted">
                    {alt.created_at ? new Date(alt.created_at).toLocaleDateString("en-IN") : "—"}
                  </Td>
                  <Td>
                    <Badge tone="positive">Allotted</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* MODALS */}
      {projectModalOpen && (
        <CreateProjectModal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} />
      )}
      {plotModalOpen && (
        <CreatePlotModal open={plotModalOpen} onClose={() => setPlotModalOpen(false)} projects={projects} />
      )}
      {allotModalOpen && (
        <AllotPlotModal
          open={allotModalOpen}
          onClose={() => setAllotModalOpen(false)}
          plots={initialPlots.filter((p) => p.status !== "Allotted")}
          preselectedPlot={selectedPlotForBooking}
        />
      )}
    </div>
  );
}
