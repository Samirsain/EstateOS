"use client";

import * as React from "react";
import { Badge, Button, Card, CustomSelect, Table, Td, Th } from "@/components/ui";
import {
  areaBreakdown,
  formatMoneyShort,
  formatNumber,
  ratePerSqft,
} from "@/lib/measure";
import type { PlotAllotmentWithDetails, PlotWithDetails, ProjectRow } from "@/lib/types";
import { CreatePlotModal, CreateProjectModal, AllotPlotModal } from "./plot-modals";
import { updatePlotStatusAction, deletePlotAction, deleteProjectAction, cancelAllotmentAction } from "./actions";

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

interface SuggestionItem {
  label: string;
  category?: string;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  suggestions: SuggestionItem[];
}

function SearchAutocomplete({
  value,
  onChange,
  placeholder = "Search...",
  suggestions,
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const matches = React.useMemo(() => {
    if (!value.trim()) return [];
    const query = value.toLowerCase().trim();
    return suggestions
      .filter(
        (item) =>
          item.label.toLowerCase().includes(query) &&
          item.label.toLowerCase() !== query
      )
      .slice(0, 7);
  }, [value, suggestions]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (label: string) => {
    onChange(label);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || matches.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < matches.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : matches.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < matches.length) {
        e.preventDefault();
        handleSelect(matches[highlightedIndex].label);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <svg className="absolute left-3.5 size-3.5 text-[#7a7a7a] pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-full border border-[#e0e0e0] bg-white pl-9 pr-8 py-1.5 text-xs text-[#1d1d1f] placeholder:text-[#a1a1a6] focus:border-[#0066cc] focus:outline-none focus:ring-2 focus:ring-[#0066cc]/20 transition-all shadow-sm"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
            }}
            className="absolute right-2.5 rounded-full p-0.5 text-[#a1a1a6] hover:text-[#1d1d1f] transition"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-[#e5e5e7] bg-white/95 backdrop-blur-md shadow-xl transition-all">
          <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#a1a1a6] border-b border-[#f0f0f0]">
            Suggestions ({matches.length})
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {matches.map((item, idx) => {
              const isSelected = idx === highlightedIndex;
              return (
                <button
                  key={`${item.label}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(item.label)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`w-full px-3.5 py-1.5 text-left flex items-center justify-between text-xs transition-colors ${
                    isSelected ? "bg-[#0066cc] text-white" : "hover:bg-[#f5f5f7] text-[#1d1d1f]"
                  }`}
                >
                  <span className="font-medium truncate">{item.label}</span>
                  {item.category && (
                    <span
                      className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : item.category === "Plot"
                          ? "bg-blue-50 text-blue-600"
                          : item.category === "Project"
                          ? "bg-purple-50 text-purple-600"
                          : item.category === "Buyer"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {item.category}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


function PlotDetailDrawer({
  plot,
  onClose,
  canAllotPlot,
  canDeletePlot,
  canCreatePlot,
  onSell,
  onHold,
  onCancelSale,
  onDelete,
}: {
  plot: PlotWithDetails;
  onClose: () => void;
  canAllotPlot: boolean;
  canDeletePlot: boolean;
  canCreatePlot: boolean;
  onSell: (p: PlotWithDetails) => void;
  onHold: (p: PlotWithDetails) => void;
  onCancelSale: (id: number, num: string) => void;
  onDelete: (p: PlotWithDetails) => void;
}) {
  const isSold = plot.status === "Sold" || plot.status === "Allotted";
  const isHold = plot.status === "Hold";
  const area = areaBreakdown(plot);
  const rate = ratePerSqft(plot.total_price, area.sqft);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const typeColor =
    (plot.plot_type || "Residential") === "Commercial" ? "bg-purple-100 text-purple-700 border-purple-200"
    : (plot.plot_type || "Residential") === "Agriculture" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : (plot.plot_type || "Residential") === "Informal" ? "bg-indigo-100 text-indigo-700 border-indigo-200"
    : "bg-sky-100 text-sky-700 border-sky-200";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-sm overflow-y-auto bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b ${
          isSold ? "bg-gradient-to-br from-rose-50 to-red-50/50 border-rose-100"
          : isHold ? "bg-amber-50 border-amber-100"
          : "bg-white border-[#f0f0f0]"
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-xl font-extrabold ${
                  isSold ? "text-rose-900" : isHold ? "text-amber-900" : "text-[#1d1d1f]"
                }`}>
                  {plot.plot_number}
                </h2>
                {isSold && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                    <span className="size-1.5 rounded-full bg-white animate-pulse"></span>SOLD
                  </span>
                )}
                {isHold && (
                  <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">HOLD</span>
                )}
                {!isSold && !isHold && (
                  <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">AVAILABLE</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[#7a7a7a]">{plot.plot_code}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="mt-2 text-xs font-semibold text-[#0066cc]">{plot.project_name}</p>
        </div>

        {/* Body */}
        <div className="flex-1 px-5 py-4 space-y-4">

          {/* Measurements — dimensions first, then every unit derived from them */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a6]">Measurement</p>
              {area.dimensions ? (
                <span className="rounded-full bg-[#0066cc] px-2 py-0.5 text-[10px] font-bold text-white">
                  {area.dimensions}
                </span>
              ) : null}
            </div>
            <div className="rounded-xl bg-[#f8f9fa] px-3 py-2.5 border border-[#e9ecef]">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[9px] font-semibold uppercase text-[#7a7a7a] tracking-wider">Sq. Feet</p>
                  <p className="text-sm font-bold text-[#1d1d1f] mt-0.5 tabular">{formatNumber(area.sqft, 0)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase text-[#7a7a7a] tracking-wider">Sq. Yard</p>
                  <p className="text-sm font-bold text-[#1d1d1f] mt-0.5 tabular">{formatNumber(area.gaj)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase text-[#7a7a7a] tracking-wider">Sq. Meter</p>
                  <p className="text-sm font-bold text-[#1d1d1f] mt-0.5 tabular">{formatNumber(area.sqm)}</p>
                </div>
              </div>
              {area.sqft >= 43560 ? (
                <p className="mt-2 border-t border-[#e9ecef] pt-2 text-[11px] text-[#7a7a7a]">
                  = <strong className="text-[#1d1d1f]">{formatNumber(area.acre, 3)} acre</strong>
                  {" · "}
                  <strong className="text-[#1d1d1f]">{formatNumber(area.bigha, 3)} bigha</strong>
                </p>
              ) : null}
            </div>
          </div>

          {/* Pricing & classification */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a6] mb-2">Pricing</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#f8f9fa] px-3 py-2.5 border border-[#e9ecef]">
                <p className="text-[9px] font-semibold uppercase text-[#7a7a7a] tracking-wider">Total Price</p>
                <p className="text-sm font-bold text-[#1d1d1f] mt-0.5">₹{formatNumber(plot.total_price, 0)}</p>
              </div>
              <div className="rounded-xl bg-[#f8f9fa] px-3 py-2.5 border border-[#e9ecef]">
                <p className="text-[9px] font-semibold uppercase text-[#7a7a7a] tracking-wider">Rate</p>
                <p className="text-sm font-bold text-[#1d1d1f] mt-0.5">₹{formatNumber(rate, 0)}/sq.ft</p>
                <p className="text-[10px] text-[#7a7a7a]">₹{formatNumber(rate * 9, 0)}/gaj</p>
              </div>
              <div className="rounded-xl bg-[#f8f9fa] px-3 py-2.5 border border-[#e9ecef]">
                <p className="text-[9px] font-semibold uppercase text-[#7a7a7a] tracking-wider">Category</p>
                <p className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${typeColor}`}>{plot.plot_type || "Residential"}</p>
              </div>
              {plot.facing && (
                <div className="rounded-xl bg-[#f8f9fa] px-3 py-2.5 border border-[#e9ecef]">
                  <p className="text-[9px] font-semibold uppercase text-[#7a7a7a] tracking-wider">Facing</p>
                  <p className="text-sm font-semibold text-[#1d1d1f] mt-0.5">{plot.facing}</p>
                </div>
              )}
              {plot.block && (
                <div className="rounded-xl bg-[#f8f9fa] px-3 py-2.5 border border-[#e9ecef]">
                  <p className="text-[9px] font-semibold uppercase text-[#7a7a7a] tracking-wider">Block</p>
                  <p className="text-sm font-semibold text-[#1d1d1f] mt-0.5">{plot.block}</p>
                </div>
              )}
            </div>
          </div>

          {/* Buyer Info — only for Sold */}
          {isSold && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a6] mb-2">Sale Information</p>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-2">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-rose-500">Buyer</p>
                  <p className="text-sm font-bold text-rose-900">{plot.customer_name || "—"}</p>
                  {plot.customer_code && (
                    <p className="text-[10px] text-rose-600 font-medium">{plot.customer_code}</p>
                  )}
                </div>
                <div className="border-t border-rose-200/60 pt-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-rose-500">Dealer / Member</p>
                  <p className="text-sm font-semibold text-rose-900">{plot.member_name || "3% Club"}</p>
                  {plot.member_code && (
                    <p className="text-[10px] text-rose-600 font-medium">{plot.member_code}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {plot.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1a6] mb-1">Notes</p>
              <p className="text-xs text-[#3a3a3c] bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-2">{plot.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`px-5 py-4 border-t space-y-2 ${
          isSold ? "border-rose-100 bg-rose-50/50" : "border-[#f0f0f0] bg-white"
        }`}>
          {!isSold && canAllotPlot && (
            <button
              onClick={() => { onSell(plot); onClose(); }}
              className="w-full rounded-xl bg-[#0066cc] py-2.5 text-sm font-bold text-white hover:bg-[#0071e3] transition-all active:scale-[0.98]"
            >
              Sell This Plot
            </button>
          )}
          {!isSold && !isHold && canCreatePlot && (
            <button
              onClick={() => { onHold(plot); onClose(); }}
              className="w-full rounded-xl border border-amber-300 bg-amber-50 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100 transition-all active:scale-[0.98]"
            >
              Put On Hold
            </button>
          )}
          {isHold && canCreatePlot && (
            <button
              onClick={() => { onHold(plot); onClose(); }}
              className="w-full rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition-all active:scale-[0.98]"
            >
              Release from Hold
            </button>
          )}
          {isSold && canDeletePlot && (
            <button
              onClick={() => { onCancelSale(plot.id, plot.plot_number); onClose(); }}
              className="w-full rounded-xl border border-rose-300 bg-rose-50 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100 transition-all active:scale-[0.98]"
            >
              Cancel Sale
            </button>
          )}
          {!isSold && canDeletePlot && (
            <button
              onClick={() => { onDelete(plot); onClose(); }}
              className="w-full rounded-xl border border-[#e0e0e0] py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-[0.98]"
            >
              Delete Plot
            </button>
          )}
        </div>
      </div>
    </>
  );
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
  const [plotSort, setPlotSort] = React.useState<string>("plot_number_asc");
  const [gridPage, setGridPage] = React.useState(1);
  const [gridGroupByProject, setGridGroupByProject] = React.useState(false);
  const GRID_PAGE_SIZE = 120;

  const [projectSearch, setProjectSearch] = React.useState("");
  const [projectSort, setProjectSort] = React.useState<string>("name_asc");

  const [allotmentSearch, setAllotmentSearch] = React.useState("");
  const [allotmentSort, setAllotmentSort] = React.useState<string>("date_desc");

  const [selectedPlotDetail, setSelectedPlotDetail] = React.useState<PlotWithDetails | null>(null);
  const [feedback, setFeedback] = React.useState<{ ok?: boolean; message?: string } | null>(null);

  const [projectModalOpen, setProjectModalOpen] = React.useState(false);
  const [plotModalOpen, setPlotModalOpen] = React.useState(false);
  const [allotModalOpen, setAllotModalOpen] = React.useState(false);
  const [selectedPlotForBooking, setSelectedPlotForBooking] = React.useState<PlotWithDetails | null>(null);

  const filteredPlots = React.useMemo(() => {
    const list = initialPlots.filter((plot) => {
      const matchesSearch =
        search === "" ||
        plot.plot_number.toLowerCase().includes(search.toLowerCase()) ||
        (plot.block && plot.block.toLowerCase().includes(search.toLowerCase())) ||
        (plot.facing && plot.facing.toLowerCase().includes(search.toLowerCase())) ||
        plot.project_name.toLowerCase().includes(search.toLowerCase()) ||
        (plot.customer_name && plot.customer_name.toLowerCase().includes(search.toLowerCase())) ||
        (plot.member_name && plot.member_name.toLowerCase().includes(search.toLowerCase()));

      const matchesProject =
        selectedProject === "all" || plot.project_id === Number(selectedProject);

      const matchesStatus =
        selectedStatus === "all" ||
        plot.status === selectedStatus ||
        (selectedStatus === "Sold" && (plot.status === "Sold" || plot.status === "Allotted"));

      const matchesType =
        selectedType === "all" || (plot.plot_type || "Residential") === selectedType;

      return matchesSearch && matchesProject && matchesStatus && matchesType;
    });

    return [...list].sort((a, b) => {
      if (plotSort === "plot_number_asc") {
        return a.plot_number.localeCompare(b.plot_number, undefined, { numeric: true });
      }
      if (plotSort === "plot_number_desc") {
        return b.plot_number.localeCompare(a.plot_number, undefined, { numeric: true });
      }
      if (plotSort === "project_name_asc") {
        return a.project_name.localeCompare(b.project_name);
      }
      if (plotSort === "price_asc") {
        return a.total_price - b.total_price;
      }
      if (plotSort === "price_desc") {
        return b.total_price - a.total_price;
      }
      /* Sort on the derived area so a plot with dimensions sorts by what the
         UI actually shows, not by a stale stored size. */
      if (plotSort === "size_asc") {
        return areaBreakdown(a).sqft - areaBreakdown(b).sqft;
      }
      if (plotSort === "size_desc") {
        return areaBreakdown(b).sqft - areaBreakdown(a).sqft;
      }
      if (plotSort === "status_asc") {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });
  }, [initialPlots, search, selectedProject, selectedStatus, selectedType, plotSort]);

  const filteredProjects = React.useMemo(() => {
    const list = projects.filter((p) => {
      if (!projectSearch) return true;
      const q = projectSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q);
    });

    return [...list].sort((a, b) => {
      if (projectSort === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (projectSort === "plots_desc") {
        return b.total_plots - a.total_plots;
      }
      if (projectSort === "location_asc") {
        return a.location.localeCompare(b.location);
      }
      return 0;
    });
  }, [projects, projectSearch, projectSort]);

  const filteredAllotments = React.useMemo(() => {
    const list = allotments.filter((alt) => {
      if (!allotmentSearch) return true;
      const q = allotmentSearch.toLowerCase();
      return (
        alt.plot_number.toLowerCase().includes(q) ||
        alt.project_name.toLowerCase().includes(q) ||
        alt.customer_name.toLowerCase().includes(q) ||
        alt.customer_code.toLowerCase().includes(q) ||
        (alt.member_name && alt.member_name.toLowerCase().includes(q)) ||
        (alt.member_code && alt.member_code.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => {
      if (allotmentSort === "date_desc") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
      if (allotmentSort === "date_asc") {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      if (allotmentSort === "customer_asc") {
        return a.customer_name.localeCompare(b.customer_name);
      }
      if (allotmentSort === "member_asc") {
        return (a.member_name || "").localeCompare(b.member_name || "");
      }
      if (allotmentSort === "project_asc") {
        return a.project_name.localeCompare(b.project_name);
      }
      if (allotmentSort === "price_desc") {
        return (b.agreed_price || 0) - (a.agreed_price || 0);
      }
      return 0;
    });
  }, [allotments, allotmentSearch, allotmentSort]);

  const plotSuggestions = React.useMemo(() => {
    const items: SuggestionItem[] = [];
    const set = new Set<string>();

    initialPlots.forEach((plot) => {
      if (plot.plot_number && !set.has(plot.plot_number)) {
        set.add(plot.plot_number);
        items.push({ label: plot.plot_number, category: "Plot" });
      }
      if (plot.project_name && !set.has(plot.project_name)) {
        set.add(plot.project_name);
        items.push({ label: plot.project_name, category: "Project" });
      }
      if (plot.customer_name && !set.has(plot.customer_name)) {
        set.add(plot.customer_name);
        items.push({ label: plot.customer_name, category: "Buyer" });
      }
      if (plot.member_name && !set.has(plot.member_name)) {
        set.add(plot.member_name);
        items.push({ label: plot.member_name, category: "Member" });
      }
    });

    customers.forEach((c) => {
      if (c.name && !set.has(c.name)) {
        set.add(c.name);
        items.push({ label: c.name, category: "Buyer" });
      }
    });

    members.forEach((m) => {
      if (m.name && !set.has(m.name)) {
        set.add(m.name);
        items.push({ label: m.name, category: "Member" });
      }
    });

    return items;
  }, [initialPlots, customers, members]);

  const projectSuggestions = React.useMemo(() => {
    const items: SuggestionItem[] = [];
    const set = new Set<string>();

    projects.forEach((prj) => {
      if (prj.name && !set.has(prj.name)) {
        set.add(prj.name);
        items.push({ label: prj.name, category: "Project" });
      }
      if (prj.location && !set.has(prj.location)) {
        set.add(prj.location);
        items.push({ label: prj.location, category: "Location" });
      }
    });

    return items;
  }, [projects]);

  const allotmentSuggestions = React.useMemo(() => {
    const items: SuggestionItem[] = [];
    const set = new Set<string>();

    allotments.forEach((alt) => {
      if (alt.plot_number && !set.has(alt.plot_number)) {
        set.add(alt.plot_number);
        items.push({ label: alt.plot_number, category: "Plot" });
      }
      if (alt.customer_name && !set.has(alt.customer_name)) {
        set.add(alt.customer_name);
        items.push({ label: alt.customer_name, category: "Buyer" });
      }
      if (alt.member_name && !set.has(alt.member_name)) {
        set.add(alt.member_name);
        items.push({ label: alt.member_name, category: "Member" });
      }
      if (alt.project_name && !set.has(alt.project_name)) {
        set.add(alt.project_name);
        items.push({ label: alt.project_name, category: "Project" });
      }
    });

    return items;
  }, [allotments]);

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

  const handleCancelAllotment = async (plotId: number, plotNum: string) => {
    if (!confirm(`Are you sure you want to cancel the sale for plot ${plotNum}? This will set the plot status back to Available.`)) return;
    const res = await cancelAllotmentAction(plotId);
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
      case "Allotted":
      case "Sold":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
            <span className="size-1.5 rounded-full bg-white animate-pulse"></span>
            SOLD
          </span>
        );
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
            Projects ({filteredProjects.length})
          </button>
          <button
            onClick={() => setActiveTab("allotments")}
            className={`rounded-full px-3.5 py-1 transition-all ${
              activeTab === "allotments" ? "bg-white text-[#1d1d1f] shadow-sm font-semibold" : "text-[#7a7a7a] hover:text-[#1d1d1f]"
            }`}
          >
            Sales History ({filteredAllotments.length})
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
              + Sell Plot
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar for Plot Views */}
      {(activeTab === "grid" || activeTab === "table") && (
        <Card className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] mb-1">Search Plot / Buyer / Project</label>
              <SearchAutocomplete
                value={search}
                onChange={setSearch}
                placeholder="Type plot #, buyer, project..."
                suggestions={plotSuggestions}
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
                  { value: "Informal", label: "Informal" },
                  { value: "Agriculture", label: "Agriculture" },
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
                  { value: "Sold", label: "Sold" },
                ]}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] mb-1">Sort By</label>
              <CustomSelect
                value={plotSort}
                onChange={setPlotSort}
                options={[
                  { value: "plot_number_asc", label: "Plot Number (A - Z)" },
                  { value: "plot_number_desc", label: "Plot Number (Z - A)" },
                  { value: "project_name_asc", label: "Project Name (A - Z)" },
                  { value: "price_asc", label: "Price (Low to High)" },
                  { value: "price_desc", label: "Price (High to Low)" },
                  { value: "size_asc", label: "Size (Small to Large)" },
                  { value: "size_desc", label: "Size (Large to Small)" },
                  { value: "status_asc", label: "Status (Available First)" },
                ]}
              />
            </div>
          </div>
        </Card>
      )}

      {/* TAB 1: VISUAL GRID VIEW */}
      {activeTab === "grid" && (
        <div className="space-y-4">

          {/* Stats Summary Bar */}
          {(() => {
            const avail = filteredPlots.filter(p => p.status === "Available").length;
            const sold  = filteredPlots.filter(p => p.status === "Sold" || p.status === "Allotted").length;
            const hold  = filteredPlots.filter(p => p.status === "Hold").length;
            const total = filteredPlots.length;
            return (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { setSelectedStatus("all"); setGridPage(1); }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                    selectedStatus === "all" ? "bg-[#1d1d1f] text-white border-[#1d1d1f]" : "bg-white text-[#1d1d1f] border-[#e0e0e0] hover:border-[#1d1d1f]"
                  }`}
                >
                  <span className="size-2 rounded-full bg-[#6e6e73]"></span>
                  All <strong>{total}</strong>
                </button>
                <button
                  onClick={() => { setSelectedStatus("Available"); setGridPage(1); }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                    selectedStatus === "Available" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-200 hover:border-emerald-400"
                  }`}
                >
                  <span className="size-2 rounded-full bg-emerald-500"></span>
                  Available <strong>{avail}</strong>
                </button>
                <button
                  onClick={() => { setSelectedStatus("Sold"); setGridPage(1); }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                    selectedStatus === "Sold" ? "bg-rose-600 text-white border-rose-600" : "bg-white text-rose-700 border-rose-200 hover:border-rose-400"
                  }`}
                >
                  <span className="size-2 rounded-full bg-rose-500"></span>
                  Sold <strong>{sold}</strong>
                </button>
                {hold > 0 && (
                  <button
                    onClick={() => { setSelectedStatus("Hold"); setGridPage(1); }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                      selectedStatus === "Hold" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-amber-700 border-amber-200 hover:border-amber-400"
                    }`}
                  >
                    <span className="size-2 rounded-full bg-amber-400"></span>
                    Hold <strong>{hold}</strong>
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => { setGridGroupByProject(g => !g); setGridPage(1); }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                      gridGroupByProject ? "bg-[#0066cc] text-white border-[#0066cc]" : "bg-white text-[#3a3a3c] border-[#e0e0e0] hover:border-[#0066cc]"
                    }`}
                  >
                    <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                    Group by Project
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Grouped View */}
          {gridGroupByProject ? (
            <div className="space-y-6">
              {projects
                .filter(prj => filteredPlots.some(p => p.project_id === prj.id || p.project_name === prj.name))
                .map(prj => {
                  const prjPlots = filteredPlots.filter(p => p.project_id === prj.id || p.project_name === prj.name);
                  return (
                    <div key={prj.id}>
                      <div className="flex items-center gap-3 mb-2.5">
                        <h3 className="text-sm font-bold text-[#1d1d1f]">{prj.name}</h3>
                        <span className="text-[10px] text-[#7a7a7a] font-medium bg-[#f5f5f7] border border-[#e0e0e0] rounded-full px-2 py-0.5">
                          {prjPlots.filter(p => p.status === "Available").length} avail · {prjPlots.filter(p => p.status === "Sold" || p.status === "Allotted").length} sold
                        </span>
                      </div>
                      <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                        {prjPlots.map(plot => {
                          const isSold = plot.status === "Sold" || plot.status === "Allotted";
                          const isHold = plot.status === "Hold";
                          return (
                            <div
                              key={plot.id}
                              onClick={() => setSelectedPlotDetail(plot)}
                              title={`${plot.plot_number} · ${plot.size_sqft} sq.ft`}
                              className={`group relative flex flex-col items-center justify-center rounded-xl border p-2 text-center cursor-pointer transition-all hover:shadow-md hover:scale-[1.04] ${
                                isSold
                                  ? "border-rose-300 bg-rose-50 ring-1 ring-rose-200"
                                  : isHold
                                  ? "border-amber-300 bg-amber-50"
                                  : "border-gray-200 bg-white hover:border-[#0066cc]/50"
                              }`}
                            >
                              <span className={`text-[11px] font-bold leading-tight ${
                                isSold ? "text-rose-800" : isHold ? "text-amber-800" : "text-[#1d1d1f]"
                              }`}>{plot.plot_number}</span>
                              <span className="text-[9px] text-[#7a7a7a] mt-0.5 leading-none">
                                {areaBreakdown(plot).dimensions ?? `${formatNumber(plot.size_sqft, 0)} sf`}
                              </span>
                              {isSold && <span className="mt-1 rounded bg-rose-600 px-1 py-0.5 text-[7px] font-extrabold text-white tracking-wider">SOLD</span>}
                              {isHold && <span className="mt-1 rounded bg-amber-500 px-1 py-0.5 text-[7px] font-extrabold text-white tracking-wider">HOLD</span>}
                              {!isSold && !isHold && canAllotPlot && (
                                <button
                                  onClick={() => { setSelectedPlotForBooking(plot); setAllotModalOpen(true); }}
                                  className="mt-1 hidden group-hover:block rounded bg-[#0066cc] px-1.5 py-0.5 text-[8px] font-bold text-white"
                                >
                                  Sell
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            /* Flat Paginated Grid */
            (() => {
              const totalPages = Math.ceil(filteredPlots.length / GRID_PAGE_SIZE);
              const pagePlots = filteredPlots.slice((gridPage - 1) * GRID_PAGE_SIZE, gridPage * GRID_PAGE_SIZE);
              return (
                <div className="space-y-4">
                  {/* Compact Tile Grid */}
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {pagePlots.map(plot => {
                      const isSold = plot.status === "Sold" || plot.status === "Allotted";
                      const isHold = plot.status === "Hold";
                      const area = areaBreakdown(plot);
                      const typeColor =
                        (plot.plot_type || "Residential") === "Commercial" ? "bg-purple-400"
                        : (plot.plot_type || "Residential") === "Agriculture" ? "bg-emerald-400"
                        : (plot.plot_type || "Residential") === "Informal" ? "bg-indigo-400"
                        : "bg-sky-400";

                      return (
                        <div
                          key={plot.id}
                          onClick={() => setSelectedPlotDetail(plot)}
                          className={`group relative flex flex-col rounded-xl border p-3 transition-all hover:shadow-md cursor-pointer ${
                            isSold
                              ? "border-rose-200 bg-gradient-to-br from-rose-50 to-red-50/50 ring-1 ring-rose-200"
                              : isHold
                              ? "border-amber-200 bg-amber-50/60"
                              : "border-gray-200 bg-white hover:border-[#0066cc]/40"
                          }`}
                        >
                          {/* Top row: plot number + type dot */}
                          <div className="flex items-start justify-between gap-1">
                            <span className={`text-xs font-bold leading-tight ${
                              isSold ? "text-rose-900" : isHold ? "text-amber-900" : "text-[#1d1d1f]"
                            }`}>{plot.plot_number}</span>
                            <span className={`size-2 rounded-full shrink-0 mt-0.5 ${typeColor}`} title={plot.plot_type || "Residential"}></span>
                          </div>

                          {/* Project name */}
                          <p className="mt-0.5 text-[9px] text-[#7a7a7a] leading-tight truncate">{plot.project_name}</p>

                          {/* Measurement — dimensions when known, then area */}
                          <p className="mt-1 text-[10px] font-semibold text-[#1d1d1f] leading-tight">
                            {area.dimensions ?? `${formatNumber(area.sqft, 0)} sq.ft`}
                          </p>
                          <p className="text-[9px] text-[#7a7a7a] leading-tight">
                            {area.dimensions ? `${formatNumber(area.sqft, 0)} sq.ft · ` : ""}
                            {formatNumber(area.gaj)} gaj
                          </p>

                          {/* Price */}
                          <p className={`text-[10px] font-semibold mt-0.5 ${
                            isSold ? "text-rose-700" : "text-[#1d1d1f]"
                          }`}>{formatMoneyShort(plot.total_price)}</p>

                          {/* Status indicator */}
                          {isSold ? (
                            <div className="mt-2 rounded-lg bg-rose-100 border border-rose-200 px-1.5 py-1">
                              <p className="text-[8px] font-extrabold text-rose-700 uppercase tracking-wider">● Sold</p>
                              <p className="text-[9px] text-rose-800 font-semibold truncate" title={plot.customer_name || ""}>
                                {plot.customer_name?.split(" ")[0] || "—"}
                              </p>
                            </div>
                          ) : isHold ? (
                            <div className="mt-2 rounded-lg bg-amber-100 border border-amber-200 px-1.5 py-1">
                              <p className="text-[8px] font-extrabold text-amber-700 uppercase tracking-wider">● On Hold</p>
                            </div>
                          ) : (
                            <div className="mt-2 flex gap-1">
                              {canCreatePlot && (
                                <button
                                  onClick={() => handleToggleHold(plot)}
                                  className="flex-1 rounded-lg border border-amber-200 bg-amber-50 py-1 text-[8px] font-bold text-amber-700 hover:bg-amber-100 transition-all"
                                >
                                  Hold
                                </button>
                              )}
                              {canAllotPlot && (
                                <button
                                  onClick={() => { setSelectedPlotForBooking(plot); setAllotModalOpen(true); }}
                                  className="flex-1 rounded-lg bg-[#0066cc] py-1 text-[8px] font-bold text-white hover:bg-[#0071e3] transition-all"
                                >
                                  Sell
                                </button>
                              )}
                            </div>
                          )}

                          {/* Delete button for non-sold */}
                          {!isSold && canDeletePlot && (
                            <button
                              onClick={() => handleDeletePlot(plot)}
                              title="Delete"
                              className="absolute top-1.5 right-1.5 hidden group-hover:flex size-5 items-center justify-center rounded-full bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition"
                            >
                              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          )}
                          {isSold && canDeletePlot && (
                            <button
                              onClick={() => handleCancelAllotment(plot.id, plot.plot_number)}
                              title="Cancel Sale"
                              className="absolute top-1.5 right-1.5 hidden group-hover:flex size-5 items-center justify-center rounded-full bg-rose-100 text-rose-500 hover:bg-rose-200 transition"
                            >
                              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-[#f0f0f0]">
                      <p className="text-xs text-[#7a7a7a]">
                        Showing <strong>{(gridPage - 1) * GRID_PAGE_SIZE + 1}–{Math.min(gridPage * GRID_PAGE_SIZE, filteredPlots.length)}</strong> of <strong>{filteredPlots.length}</strong> plots
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setGridPage(p => Math.max(1, p - 1))}
                          disabled={gridPage === 1}
                          className="rounded-full border border-[#e0e0e0] px-3 py-1 text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          ← Prev
                        </button>
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                          const pg = totalPages <= 7 ? i + 1 : gridPage <= 4 ? i + 1 : gridPage >= totalPages - 3 ? totalPages - 6 + i : gridPage - 3 + i;
                          return (
                            <button
                              key={pg}
                              onClick={() => setGridPage(pg)}
                              className={`rounded-full size-7 text-xs font-semibold transition ${
                                pg === gridPage ? "bg-[#0066cc] text-white" : "border border-[#e0e0e0] text-[#3a3a3c] hover:bg-[#f5f5f7]"
                              }`}
                            >
                              {pg}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setGridPage(p => Math.min(totalPages, p + 1))}
                          disabled={gridPage === totalPages}
                          className="rounded-full border border-[#e0e0e0] px-3 py-1 text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 pt-1 text-[10px] text-[#7a7a7a]">
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-sky-400"></span> Residential</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-purple-400"></span> Commercial</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-indigo-400"></span> Informal</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400"></span> Agriculture</span>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* TAB 2: DETAILED TABLE VIEW */}
      {activeTab === "table" && (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Plot Number</Th>
                <Th>Facing</Th>
                <Th>Category</Th>
                <Th>Project Name</Th>
                <Th>Dimensions</Th>
                <Th>Area</Th>
                <Th>Status</Th>
                <Th>Assigned Customer / Member</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredPlots.map((plot) => {
                const isOccupied = plot.status === "Allotted" || plot.status === "Sold";
                const plotArea = areaBreakdown(plot);
                return (
                  <tr key={plot.id} className={isOccupied ? "bg-rose-50/70 hover:bg-rose-100/60 transition-colors border-b border-rose-100" : ""}>
                    <Td className={isOccupied ? "font-extrabold text-rose-950 flex items-center gap-1.5" : "font-bold text-ink"}>
                      <span>{plot.plot_number}</span>
                      {isOccupied && (
                        <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[8px] font-extrabold text-white tracking-wider">
                          SOLD
                        </span>
                      )}
                    </Td>
                    <Td className="text-xs text-[#7a7a7a] font-medium">{plot.facing || "—"}</Td>
                    <Td>
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                        (plot.plot_type || "Residential") === "Commercial"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : (plot.plot_type || "Residential") === "Agriculture"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : (plot.plot_type || "Residential") === "Informal"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {plot.plot_type || "Residential"}
                      </span>
                    </Td>
                    <Td>{plot.project_name}</Td>
                    <Td className="whitespace-nowrap">
                      {plotArea.dimensions ? (
                        <span className="font-semibold text-[#1d1d1f]">{plotArea.dimensions}</span>
                      ) : (
                        <span className="text-[#a1a1a6]">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <p className="font-semibold text-[#1d1d1f] tabular">
                        {formatNumber(plotArea.sqft, 0)} sq.ft
                      </p>
                      <p className="text-[11px] text-[#7a7a7a] tabular">
                        {formatNumber(plotArea.gaj)} gaj · {formatNumber(plotArea.sqm)} sq.m
                      </p>
                    </Td>
                    <Td>{getStatusBadge(plot.status)}</Td>
                    <Td>
                      {plot.status === "Sold" && plot.customer_name && plot.customer_name.trim() ? (
                        <div className="text-xs">
                          <p className="font-semibold text-[#1d1d1f]">
                            {plot.customer_name}
                            {plot.customer_code ? <span className="ml-1 text-[10px] font-normal text-[#7a7a7a] tabular">({plot.customer_code})</span> : null}
                          </p>
                          <p className="text-[#7a7a7a] text-[11px]">
                            Ref: {plot.member_name || "3% Club"}
                            {plot.member_code ? <span className="ml-1 text-[10px] text-[#7a7a7a] tabular">({plot.member_code})</span> : null}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-[#7a7a7a]">—</span>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isOccupied && canAllotPlot && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2.5 py-1 text-xs"
                            onClick={() => { setSelectedPlotForBooking(plot); setAllotModalOpen(true); }}
                          >
                            Sell Plot
                          </Button>
                        )}
                        {isOccupied && canDeletePlot && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="px-2.5 py-1 text-xs text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                            onClick={() => handleCancelAllotment(plot.id, plot.plot_number)}
                          >
                            Cancel Sale
                          </Button>
                        )}
                        {!isOccupied && canDeletePlot && (
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
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* TAB 3: PROJECTS TAB */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] mb-1">Search Projects</label>
                <SearchAutocomplete
                  value={projectSearch}
                  onChange={setProjectSearch}
                  placeholder="Type project name or location..."
                  suggestions={projectSuggestions}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] mb-1">Sort By</label>
                <CustomSelect
                  value={projectSort}
                  onChange={setProjectSort}
                  options={[
                    { value: "name_asc", label: "Project Name (A - Z)" },
                    { value: "plots_desc", label: "Total Plots (High to Low)" },
                    { value: "location_asc", label: "Location (A - Z)" },
                  ]}
                />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredProjects.map((prj) => {
              const projectPlots = initialPlots.filter(
                (p) => p.project_id === prj.id || p.project_name === prj.name
              );
              const totalPlotsCount = projectPlots.length || prj.total_plots || 0;
              const residentialCount = projectPlots.filter(
                (p) => (p.plot_type || "Residential") === "Residential"
              ).length;
              const commercialCount = projectPlots.filter(
                (p) => p.plot_type === "Commercial"
              ).length;
              const agricultureCount = projectPlots.filter(
                (p) => p.plot_type === "Agriculture"
              ).length;
              const informalCount = projectPlots.filter(
                (p) => p.plot_type === "Informal"
              ).length;

              const availableCount = projectPlots.filter(
                (p) => p.status === "Available"
              ).length;
              const soldCount = projectPlots.filter(
                (p) => p.status === "Sold" || p.status === "Allotted"
              ).length;
              const holdCount = projectPlots.filter(
                (p) => p.status === "Hold"
              ).length;

              return (
                <Card key={prj.id} className="p-5 flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-ink">{prj.name}</h3>
                        <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                          <svg className="size-3.5 text-[#7a7a7a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {prj.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
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

                    {prj.description ? <p className="mt-2 text-xs text-ink-muted">{prj.description}</p> : null}

                    {/* Plot Categories Breakdown */}
                    <div className="mt-3.5 rounded-xl bg-[#f8f9fa] p-3 border border-[#e9ecef]">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#495057] mb-2">
                        <span>Plot Categories</span>
                        <span className="text-[#0066cc] font-bold">{totalPlotsCount} Total Plots</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-[#e0e0e0] shadow-2xs">
                          <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                            <span className="size-2 rounded-full bg-blue-500"></span> Residential
                          </span>
                          <span className="font-bold text-ink">{residentialCount}</span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-[#e0e0e0] shadow-2xs">
                          <span className="flex items-center gap-1.5 text-purple-700 font-medium">
                            <span className="size-2 rounded-full bg-purple-500"></span> Commercial
                          </span>
                          <span className="font-bold text-ink">{commercialCount}</span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-[#e0e0e0] shadow-2xs">
                          <span className="flex items-center gap-1.5 text-indigo-700 font-medium">
                            <span className="size-2 rounded-full bg-indigo-500"></span> Informal
                          </span>
                          <span className="font-bold text-ink">{informalCount}</span>
                        </div>

                        <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-[#e0e0e0] shadow-2xs">
                          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <span className="size-2 rounded-full bg-emerald-500"></span> Agriculture
                          </span>
                          <span className="font-bold text-ink">{agricultureCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Plot Status Availability Breakdown */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <span className="size-2 rounded-full bg-emerald-500"></span>
                        <span>Available: <strong>{availableCount}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                        <span className="size-2 rounded-full bg-rose-500"></span>
                        <span>Sold: <strong>{soldCount}</strong></span>
                      </div>
                      {holdCount > 0 && (
                        <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <span className="size-2 rounded-full bg-amber-500"></span>
                          <span>Hold: <strong>{holdCount}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ALLOTMENTS HISTORY TAB */}
      {activeTab === "allotments" && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] mb-1">Search Sales</label>
                <SearchAutocomplete
                  value={allotmentSearch}
                  onChange={setAllotmentSearch}
                  placeholder="Type customer, member, plot #..."
                  suggestions={allotmentSuggestions}
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] mb-1">Sort By</label>
                <CustomSelect
                  value={allotmentSort}
                  onChange={setAllotmentSort}
                  options={[
                    { value: "date_desc", label: "Sale Date (Newest First)" },
                    { value: "date_asc", label: "Sale Date (Oldest First)" },
                    { value: "customer_asc", label: "Customer Name (A - Z)" },
                    { value: "member_asc", label: "Member (A - Z)" },
                    { value: "project_asc", label: "Project Name (A - Z)" },
                    { value: "price_desc", label: "Sale Price (High to Low)" },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Plot & Project</Th>
                  <Th>Customer</Th>
                  <Th>Member</Th>
                  <Th>Agreed Price</Th>
                  <Th>Sale Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {filteredAllotments.map((alt) => (
                  <tr key={alt.id}>
                    <Td>
                      <p className="font-semibold text-[#1d1d1f]">{alt.plot_number}</p>
                      <p className="text-xs text-[#7a7a7a]">{alt.project_name}</p>
                    </Td>
                    <Td>
                      <p className="font-semibold text-[#1d1d1f]">{alt.customer_name}</p>
                      <p className="text-xs text-[#7a7a7a] tabular font-medium">Code: {alt.customer_code} · {alt.customer_mobile}</p>
                    </Td>
                    <Td>
                      <p className="font-semibold text-[#1d1d1f]">{alt.member_name || "3% Club"}</p>
                      <p className="text-xs text-[#7a7a7a] tabular font-medium">Code: {alt.member_code || "3% CLUB"}</p>
                    </Td>
                    <Td className="font-semibold text-ink">
                      ₹{alt.agreed_price ? alt.agreed_price.toLocaleString("en-IN") : "—"}
                    </Td>
                    <Td className="text-xs text-ink-muted">
                      {alt.created_at ? new Date(alt.created_at).toLocaleDateString("en-IN") : "—"}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                        <span className="size-1.5 rounded-full bg-white animate-pulse"></span>
                        SOLD
                      </span>
                    </Td>
                    <Td className="text-right">
                      {canDeletePlot && (
                        <button
                          onClick={() => handleCancelAllotment(alt.plot_id, alt.plot_number)}
                          className="rounded-full px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all active:scale-95"
                        >
                          Cancel Sale
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </div>
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
          plots={initialPlots.filter((p) => p.status !== "Allotted" && p.status !== "Sold")}
          customers={customers}
          members={members}
          preselectedPlot={selectedPlotForBooking}
        />
      )}

      {/* Plot Detail Drawer */}
      {selectedPlotDetail && (
        <PlotDetailDrawer
          plot={selectedPlotDetail}
          onClose={() => setSelectedPlotDetail(null)}
          canAllotPlot={canAllotPlot}
          canDeletePlot={canDeletePlot}
          canCreatePlot={canCreatePlot}
          onSell={(p) => { setSelectedPlotForBooking(p); setAllotModalOpen(true); }}
          onHold={handleToggleHold}
          onCancelSale={handleCancelAllotment}
          onDelete={handleDeletePlot}
        />
      )}
    </div>
  );
}
