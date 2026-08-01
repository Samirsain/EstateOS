import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintSheet } from "@/components/print-sheet";
import { formatDateTime } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { maskLast4 } from "@/lib/display";
import { getMemberByCode } from "@/lib/queries";

export const metadata: Metadata = { title: "Member registration form" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 border-b border-dashed border-line py-2 text-sm">
      <span className="w-48 shrink-0 font-medium text-ink-muted">{label}</span>
      <span className="text-ink">{value || "—"}</span>
    </div>
  );
}

export default async function MemberPrintPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requirePermission("members.view");
  const { code } = await params;
  const member = getMemberByCode(decodeURIComponent(code));
  if (!member) notFound();

  const dealsIn: string[] = JSON.parse(member.deals_in || "[]");

  return (
    <PrintSheet backHref={`/members/${member.member_code}`}>
      <header className="mb-6 border-b-2 border-ink pb-4 text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">
          Member Registration Form
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Customer &amp; Member Management System
        </p>
      </header>

      <div className="mb-6 flex justify-between gap-6 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">
            Member ID
          </p>
          <p className="tabular text-lg font-bold">{member.member_code}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-ink-muted">
            Invite code
          </p>
          <p className="text-lg font-bold tracking-[0.15em]">
            {member.invite_code}
          </p>
        </div>
      </div>

      <Row label="Name" value={member.name} />
      <Row label="Dealer name" value={member.dealer_name ?? ""} />
      <Row label="Mobile number" value={member.mobile} />
      <Row label="Alternate mobile" value={member.alternate_mobile ?? ""} />
      <Row label="City" value={member.city ?? ""} />
      <Row label="Company name" value={member.company_name ?? ""} />
      <Row label="Deals in" value={dealsIn.join(", ")} />
      <Row label="Experience" value={member.experience ?? ""} />
      <Row label="Aadhaar number" value={maskLast4(member.aadhaar_last4)} />
      <Row label="Registered on" value={formatDateTime(member.created_at)} />
      <Row label="Customers referred" value={String(member.customer_count)} />

      <div className="mt-12 flex justify-between gap-8 text-sm">
        <div className="flex-1 border-t border-ink pt-2 text-center text-ink-muted">
          Member signature
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
