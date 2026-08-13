"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, Input, Modal, Select } from "@/components/ui";
import { createPlotAction, createProjectAction, allotPlotAction } from "./actions";
import type { PlotWithDetails, ProjectRow } from "@/lib/types";

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Processing..." : label}
    </Button>
  );
}

export function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [feedback, setFeedback] = React.useState<{ ok?: boolean; message?: string; errors?: Record<string, string> } | null>(null);

  async function handleSubmit(formData: FormData) {
    setFeedback(null);
    const res = await createProjectAction({ ok: false, message: "" }, formData);
    setFeedback(res);
    if (res.ok) {
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1200);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create New Real Estate Project">
      <form action={handleSubmit} className="space-y-4">
        {feedback && (
          <div
            className={`rounded-lg p-3 text-sm font-medium ${
              feedback.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Project Name *</label>
          <Input name="name" placeholder="e.g. Green Valley Township Phase 1" required />
          {feedback?.errors?.name && <p className="text-xs text-rose-600 mt-1">{feedback.errors.name}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Location / City *</label>
          <Input name="location" placeholder="e.g. Jaipur, Ajmer Road Highway" required />
          {feedback?.errors?.location && <p className="text-xs text-rose-600 mt-1">{feedback.errors.location}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Project Status</label>
          <Select name="status" defaultValue="Active">
            <option value="Active">Active</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Project Category / Type</label>
          <Select name="project_type" defaultValue="Residential">
            <option value="Residential">Residential Township</option>
            <option value="Commercial">Commercial Project</option>
            <option value="Agriculture">Agricultural / Farmland</option>
          </Select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Description / Amenities</label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded-lg border border-line p-2.5 text-sm focus:border-brand-500 focus:outline-none"
            placeholder="Plot layout details, 40ft roads, underground water & electricity..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitBtn label="Create Project" />
        </div>
      </form>
    </Modal>
  );
}

export function CreatePlotModal({
  open,
  onClose,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  projects: ProjectRow[];
}) {
  const [feedback, setFeedback] = React.useState<{ ok?: boolean; message?: string; errors?: Record<string, string> } | null>(null);
  const [sizeSqft, setSizeSqft] = React.useState<number>(1200);
  const [ratePerSqft, setRatePerSqft] = React.useState<number>(1500);

  const calculatedTotal = (sizeSqft || 0) * (ratePerSqft || 0);

  async function handleSubmit(formData: FormData) {
    setFeedback(null);
    const res = await createPlotAction({ ok: false, message: "" }, formData);
    setFeedback(res);
    if (res.ok) {
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1200);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Plot to Inventory">
      <form action={handleSubmit} className="space-y-4">
        {feedback && (
          <div
            className={`rounded-lg p-3 text-sm font-medium ${
              feedback.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Select Project *</label>
          <Select name="project_id" required defaultValue={projects[0]?.id || ""}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.location})
              </option>
            ))}
          </Select>
          {feedback?.errors?.project_id && <p className="text-xs text-rose-600 mt-1">{feedback.errors.project_id}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Plot Number *</label>
            <Input name="plot_number" placeholder="e.g. A-101" required />
            {feedback?.errors?.plot_number && <p className="text-xs text-rose-600 mt-1">{feedback.errors.plot_number}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Block / Sector</label>
            <Input name="block" placeholder="e.g. Block A" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Plot Area (Sq. Ft) *</label>
            <Input
              name="size_sqft"
              type="number"
              value={sizeSqft}
              onChange={(e) => setSizeSqft(Number(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Rate per Sq. Ft (₹) *</label>
            <Input
              name="rate_per_sqft"
              type="number"
              value={ratePerSqft}
              onChange={(e) => setRatePerSqft(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div className="rounded-lg bg-brand-50 p-3 border border-brand-200">
          <p className="text-xs text-brand-700 font-medium">Auto-Calculated Total Price:</p>
          <p className="text-xl font-bold text-brand-900">₹{calculatedTotal.toLocaleString("en-IN")}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Facing</label>
            <Select name="facing" defaultValue="East">
              <option value="East">East Facing</option>
              <option value="West">West Facing</option>
              <option value="North">North Facing</option>
              <option value="South">South Facing</option>
              <option value="Corner">Corner Plot</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Plot Type / Category</label>
            <Select name="plot_type" defaultValue="Residential">
              <option value="Residential">Residential Plot</option>
              <option value="Commercial">Commercial Plot</option>
              <option value="Agriculture">Agricultural / Farmland</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Notes / Remarks</label>
          <Input name="notes" placeholder="Park facing, 60ft wide road access..." />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitBtn label="Save Plot to Inventory" />
        </div>
      </form>
    </Modal>
  );
}

export function AllotPlotModal({
  open,
  onClose,
  plots,
  preselectedPlot,
}: {
  open: boolean;
  onClose: () => void;
  plots: PlotWithDetails[];
  customers?: unknown;
  members?: unknown;
  preselectedPlot?: PlotWithDetails | null;
}) {
  const [feedback, setFeedback] = React.useState<{ ok?: boolean; message?: string; errors?: Record<string, string> } | null>(null);
  const [selectedPlotId, setSelectedPlotId] = React.useState<number>(preselectedPlot?.id || plots[0]?.id || 0);

  async function handleSubmit(formData: FormData) {
    setFeedback(null);
    const res = await allotPlotAction({ ok: false, message: "" }, formData);
    setFeedback(res);
    if (res.ok) {
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1500);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Allot Plot — Register Buyer">
      <form action={handleSubmit} className="space-y-4">
        {feedback && (
          <div
            className={`rounded-lg p-3 text-sm font-medium ${
              feedback.ok
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Plot Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Select Plot *</label>
          <Select
            name="plot_id"
            value={selectedPlotId}
            onChange={(e) => setSelectedPlotId(Number(e.target.value))}
            required
          >
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.plot_number} ({p.plot_code}) — {p.project_name} — ₹{p.total_price.toLocaleString("en-IN")}
              </option>
            ))}
          </Select>
          {feedback?.errors?.plot_id && <p className="text-xs text-rose-600 mt-1">{feedback.errors.plot_id}</p>}
        </div>

        <div className="border-t border-line pt-4">
          <p className="text-xs font-bold uppercase text-ink-muted mb-3 tracking-wide">Buyer Details (New Customer Registration)</p>

          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Full Name *</label>
              <Input name="customer_name" placeholder="e.g. Rajesh Kumar" required autoComplete="off" />
              {feedback?.errors?.customer_name && <p className="text-xs text-rose-600 mt-1">{feedback.errors.customer_name}</p>}
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Mobile Number *</label>
              <Input name="customer_mobile" placeholder="10-digit mobile" inputMode="numeric" required autoComplete="off" />
              {feedback?.errors?.customer_mobile && <p className="text-xs text-rose-600 mt-1">{feedback.errors.customer_mobile}</p>}
            </div>

            {/* Customer Type */}
            <div>
              <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Customer Type</label>
              <Select name="customer_type" defaultValue="Investor">
                <option value="Investor">Investor</option>
                <option value="User">User</option>
              </Select>
            </div>

            {/* Aadhaar */}
            <div>
              <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Aadhaar Number (Last 4 digits stored)</label>
              <Input name="customer_aadhaar" placeholder="12-digit Aadhaar" inputMode="numeric" autoComplete="off" />
            </div>
          </div>
        </div>

        {/* Member Invite Code */}
        <div className="border-t border-line pt-4">
          <p className="text-xs font-bold uppercase text-ink-muted mb-3 tracking-wide">Member Invite Code (Optional)</p>
          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Invite Code (Optional)</label>
            <Input name="invite_code" placeholder="e.g. 3C001" autoComplete="off" />
            <p className="text-xs text-ink-muted mt-1">Enter Member ID / Invite Code if referred by an agent, or leave empty for direct allotment.</p>
            {feedback?.errors?.invite_code && <p className="text-xs text-rose-600 mt-1">{feedback.errors.invite_code}</p>}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Notes (Optional)</label>
          <Input name="notes" placeholder="Any remarks..." />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <SubmitBtn label="Register Buyer & Allot Plot" />
        </div>
      </form>
    </Modal>
  );
}
