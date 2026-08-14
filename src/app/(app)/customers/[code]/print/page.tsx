import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintSheet } from "@/components/print-sheet";
import { formatDateTime } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { maskLast4 } from "@/lib/display";
import { getCustomerByCode } from "@/lib/queries";

export const metadata: Metadata = { title: "Customer registration form" };

function Row({
  label,
  value,
}: {
  label: string;
  /* Nullable by design — the fallback below already renders an em dash. */
  value: string | null | undefined;
}) {
  return (
    <div className="flex gap-4 border-b border-dashed border-line py-2 text-sm">
      <span className="w-48 shrink-0 font-medium text-ink-muted">{label}</span>
      <span className="text-ink">{value || "—"}</span>
    </div>
  );
}

export default async function CustomerPrintPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requirePermission("customers.view");
  const { code } = await params;
  const customer = await getCustomerByCode(decodeURIComponent(code));
  if (!customer) notFound();

  return (
    <PrintSheet backHref={`/customers/${customer.customer_code}`}>
      <header className="mb-6 border-b-2 border-ink pb-4 text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">
          Customer Registration Form
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Customer &amp; Member Management System
        </p>
      </header>

      <div className="mb-6 flex justify-between gap-6 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">
            Customer ID
          </p>
          <p className="tabular text-lg font-bold">{customer.customer_code}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-ink-muted">
            Referred by
          </p>
          <p className="text-lg font-bold">{customer.member_code}</p>
        </div>
      </div>

      <Row label="Name" value={customer.name} />
      <Row label="Mobile number" value={customer.mobile} />
      <Row label="Customer type" value={customer.customer_type} />
      <Row label="Aadhaar number" value={maskLast4(customer.aadhaar_last4)} />
      <Row label="Assigned member" value={customer.member_name} />
      <Row label="Member ID" value={customer.member_code} />
      <Row label="Invite code" value={customer.invite_code} />
      <Row label="Registered on" value={formatDateTime(customer.created_at)} />

      <div className="mt-12 flex justify-between gap-8 text-sm">
        <div className="flex-1 border-t border-ink pt-2 text-center text-ink-muted">
          Customer signature
        </div>
        <div className="flex-1 border-t border-ink pt-2 text-center text-ink-muted">
          Process Coordinator
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-ink-muted">
        This form is system generated. Aadhaar details are stored encrypted and
        shown masked.
      </p>
    </PrintSheet>
  );
}
