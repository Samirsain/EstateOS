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

        <div>
          <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Plot Number *</label>
          <Input name="plot_number" placeholder="e.g. A-101" required />
          {feedback?.errors?.plot_number && <p className="text-xs text-rose-600 mt-1">{feedback.errors.plot_number}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Plot Area (Sq. Ft) *</label>
            <Input
              name="size_sqft"
              type="number"
              placeholder="e.g. 1200"
              required
            />
            {feedback?.errors?.size_sqft && <p className="text-xs text-rose-600 mt-1">{feedback.errors.size_sqft}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Total Plot Price (₹) *</label>
            <Input
              name="total_price"
              type="number"
              placeholder="e.g. 1800000"
              required
            />
            {feedback?.errors?.total_price && <p className="text-xs text-rose-600 mt-1">{feedback.errors.total_price}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Facing</label>
            <Select name="facing" defaultValue="East">
              <option value="East">East Facing</option>
              <option value="West">West Facing</option>
              <option value="North">North Facing</option>
              <option value="South">South Facing</option>
              <option value="North-East (NE)">North-East (NE) Facing</option>
              <option value="North-West (NW)">North-West (NW) Facing</option>
              <option value="South-East (SE)">South-East (SE) Facing</option>
              <option value="South-West (SW)">South-West (SW) Facing</option>
              <option value="2-Side Open">2-Side Open</option>
              <option value="3-Side Open">3-Side Open</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Plot Type / Category</label>
            <Select name="plot_type" defaultValue="Residential">
              <option value="Residential">Residential</option>
              <option value="Commercial">Commercial</option>
              <option value="Informal">Informal</option>
              <option value="Agriculture">Agriculture</option>
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
  customers = [],
  members = [],
  preselectedPlot,
}: {
  open: boolean;
  onClose: () => void;
  plots: PlotWithDetails[];
  customers?: { id: number; customer_code: string; name: string; mobile?: string }[];
  members?: { id: number; member_code: string; name: string }[];
  preselectedPlot?: PlotWithDetails | null;
}) {
  const [feedback, setFeedback] = React.useState<{ ok?: boolean; message?: string; errors?: Record<string, string> } | null>(null);
  const [selectedPlotId, setSelectedPlotId] = React.useState<number>(preselectedPlot?.id || plots[0]?.id || 0);
  const [buyerMode, setBuyerMode] = React.useState<"new" | "existing">("new");
  const [referralType, setReferralType] = React.useState<"none" | "member" | "customer">("none");

  const [buyerCodeInput, setBuyerCodeInput] = React.useState("");
  const [memberCodeInput, setMemberCodeInput] = React.useState("");
  const [customerCodeInput, setCustomerCodeInput] = React.useState("");

  /* Memoised so the fallback empty array is not a fresh reference on every
     render, which would re-run all three lookups below each keystroke. */
  const customersList = React.useMemo(
    () => (Array.isArray(customers) ? customers : []),
    [customers],
  );
  const membersList = React.useMemo(
    () => (Array.isArray(members) ? members : []),
    [members],
  );

  const matchedBuyer = React.useMemo(() => {
    const query = buyerCodeInput.trim().toUpperCase();
    if (!query) return null;
    return customersList.find(
      (c) =>
        c.customer_code.toUpperCase() === query ||
        (c.mobile && c.mobile.includes(query))
    );
  }, [buyerCodeInput, customersList]);

  const matchedMember = React.useMemo(() => {
    const code = memberCodeInput.trim().toUpperCase();
    if (!code) return null;
    return membersList.find((m) => m.member_code.toUpperCase() === code);
  }, [memberCodeInput, membersList]);

  const matchedCustomer = React.useMemo(() => {
    const code = customerCodeInput.trim().toUpperCase();
    if (!code) return null;
    return customersList.find((c) => c.customer_code.toUpperCase() === code);
  }, [customerCodeInput, customersList]);

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
    <Modal open={open} onClose={onClose} title="Sell Plot — Complete Sale">
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
                {p.plot_number} — {p.project_name} — ₹{p.total_price.toLocaleString("en-IN")}
              </option>
            ))}
          </Select>
          {feedback?.errors?.plot_id && <p className="text-xs text-rose-600 mt-1">{feedback.errors.plot_id}</p>}
        </div>

        {/* Buyer Selection Mode */}
        <div className="border-t border-line pt-4 space-y-3">
          <p className="text-xs font-bold uppercase text-ink-muted tracking-wide">Buyer Selection</p>
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 text-xs font-semibold text-gray-700 border border-gray-200">
            <button
              type="button"
              onClick={() => setBuyerMode("new")}
              className={`flex-1 rounded-md py-1.5 transition ${buyerMode === "new" ? "bg-white shadow text-gray-900 font-bold" : "text-gray-500 hover:text-gray-900"}`}
            >
              + New Customer
            </button>
            <button
              type="button"
              onClick={() => setBuyerMode("existing")}
              className={`flex-1 rounded-md py-1.5 transition ${buyerMode === "existing" ? "bg-white shadow text-gray-900 font-bold" : "text-gray-500 hover:text-gray-900"}`}
            >
              Existing Customer ({customersList.length})
            </button>
          </div>

          {buyerMode === "existing" ? (
            <div className="space-y-2 bg-[#f8f9fa] p-3 rounded-lg border border-[#e0e0e0]">
              <label className="block text-xs font-semibold uppercase text-ink-muted">Enter Buyer Customer ID or Mobile *</label>
              <Input
                value={buyerCodeInput}
                onChange={(e) => setBuyerCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. TM0001 or mobile number"
                autoComplete="off"
                required
              />
              <input
                type="hidden"
                name="existing_customer_id"
                value={matchedBuyer ? matchedBuyer.id : ""}
              />
              {buyerCodeInput.trim() ? (
                matchedBuyer ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-md border border-emerald-200">
                    <span>✓ Buyer Found:</span>
                    <span className="font-bold">{matchedBuyer.name}</span>
                    <span className="text-emerald-600">({matchedBuyer.customer_code})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                    <span>⚠ No customer found matching ID &quot;{buyerCodeInput.toUpperCase()}&quot;</span>
                  </div>
                )
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Full Name *</label>
                <Input name="customer_name" placeholder="e.g. Rajesh Kumar" required={buyerMode === "new"} autoComplete="off" />
                {feedback?.errors?.customer_name && <p className="text-xs text-rose-600 mt-1">{feedback.errors.customer_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Mobile Number *</label>
                <Input name="customer_mobile" placeholder="10-digit mobile" inputMode="numeric" required={buyerMode === "new"} autoComplete="off" />
                {feedback?.errors?.customer_mobile && <p className="text-xs text-rose-600 mt-1">{feedback.errors.customer_mobile}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Customer Type</label>
                  <Select name="customer_type" defaultValue="Investor">
                    <option value="Investor">Investor</option>
                    <option value="User">User</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Aadhaar (Last 4 digits stored)</label>
                  <Input name="customer_aadhaar" placeholder="12-digit Aadhaar" inputMode="numeric" autoComplete="off" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Referral / Member Source */}
        <div className="border-t border-line pt-4 space-y-3">
          <p className="text-xs font-bold uppercase text-ink-muted tracking-wide">Referral Source</p>
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 text-xs font-semibold text-gray-700 border border-gray-200">
            <button
              type="button"
              onClick={() => setReferralType("none")}
              className={`flex-1 rounded-md py-1.5 transition ${referralType === "none" ? "bg-white shadow text-gray-900 font-bold" : "text-gray-500 hover:text-gray-900"}`}
            >
              3% Club (Direct)
            </button>
            <button
              type="button"
              onClick={() => setReferralType("member")}
              className={`flex-1 rounded-md py-1.5 transition ${referralType === "member" ? "bg-white shadow text-gray-900 font-bold" : "text-gray-500 hover:text-gray-900"}`}
            >
              Member
            </button>
            <button
              type="button"
              onClick={() => setReferralType("customer")}
              className={`flex-1 rounded-md py-1.5 transition ${referralType === "customer" ? "bg-white shadow text-gray-900 font-bold" : "text-gray-500 hover:text-gray-900"}`}
            >
              Customer Referral
            </button>
          </div>

          {referralType === "member" && (
            <div className="space-y-2 bg-[#f8f9fa] p-3 rounded-lg border border-[#e0e0e0]">
              <label className="block text-xs font-semibold uppercase text-ink-muted">Enter Member ID</label>
              <Input
                value={memberCodeInput}
                onChange={(e) => setMemberCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. 3C005"
                autoComplete="off"
              />
              <input
                type="hidden"
                name="referring_member_id"
                value={matchedMember ? matchedMember.id : ""}
              />
              <input
                type="hidden"
                name="invite_code"
                value={memberCodeInput}
              />
              {memberCodeInput.trim() ? (
                matchedMember ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-md border border-emerald-200">
                    <span>✓ Member Found:</span>
                    <span className="font-bold">{matchedMember.name}</span>
                    <span className="text-emerald-600">({matchedMember.member_code})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                    <span>⚠ No member found with Member ID &quot;{memberCodeInput.toUpperCase()}&quot;</span>
                  </div>
                )
              ) : null}
            </div>
          )}

          {referralType === "customer" && (
            <div className="space-y-2 bg-[#f8f9fa] p-3 rounded-lg border border-[#e0e0e0]">
              <label className="block text-xs font-semibold uppercase text-ink-muted">Enter Referring Customer ID</label>
              <Input
                value={customerCodeInput}
                onChange={(e) => setCustomerCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. TM0001"
                autoComplete="off"
                required
              />
              <input
                type="hidden"
                name="referring_customer_id"
                value={matchedCustomer ? matchedCustomer.id : ""}
              />
              {customerCodeInput.trim() ? (
                matchedCustomer ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-md border border-emerald-200">
                    <span>✓ Customer Found:</span>
                    <span className="font-bold">{matchedCustomer.name}</span>
                    <span className="text-emerald-600">({matchedCustomer.customer_code})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                    <span>⚠ No customer found with Customer ID &quot;{customerCodeInput.toUpperCase()}&quot;</span>
                  </div>
                )
              ) : null}
            </div>
          )}
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
          <SubmitBtn label="Confirm Sale" />
        </div>
      </form>
    </Modal>
  );
}
