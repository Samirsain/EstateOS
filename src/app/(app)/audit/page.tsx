import type { Metadata } from "next";
import Link from "next/link";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  formatDateTime,
} from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { listAuditLogs, listDuplicateAttempts } from "@/lib/queries";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const ACTION_FILTERS = [
  { value: "", label: "All activity" },
  { value: "customer", label: "Customers" },
  { value: "member", label: "Members" },
  { value: "user", label: "Users" },
  { value: "login", label: "Sign-ins" },
  { value: "report", label: "Exports" },
];

function toneFor(action: string) {
  if (action.includes("duplicate") || action.includes("failed")) return "danger";
  if (action.includes("transferred") || action.includes("deactivated"))
    return "warning";
  if (action.includes("created")) return "positive";
  return "neutral";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  await requirePermission("audit.view");
  const { action = "" } = await searchParams;

  const logs = listAuditLogs({ action: action || undefined, limit: 250 });
  const duplicates = listDuplicateAttempts(50);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every state change in the system, in order. Managing Director only."
        action={
          <a
            href="/api/export?dataset=audit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface px-3.5 py-2 text-sm font-medium text-ink ring-1 ring-inset ring-line transition hover:bg-gray-50"
          >
            Export audit log
          </a>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1 no-print">
        {ACTION_FILTERS.map((filter) => {
          const active = filter.value === action;
          return (
            <Link
              key={filter.value || "all"}
              href={filter.value ? `/audit?action=${filter.value}` : "/audit"}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-muted hover:bg-gray-100 hover:text-ink"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <Card className="mb-5">
        <CardHeader
          title="Activity"
          description={`Showing the ${logs.length} most recent entries.`}
        />
        {logs.length === 0 ? (
          <EmptyState title="No activity recorded for this filter" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Reference</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <Td className="whitespace-nowrap text-ink-muted">
                    {formatDateTime(log.created_at)}
                  </Td>
                  <Td>
                    {log.actor_name}
                    <p className="text-xs text-ink-muted">{log.actor_role}</p>
                  </Td>
                  <Td>
                    <Badge tone={toneFor(log.action)}>{log.action}</Badge>
                  </Td>
                  <Td className="tabular">{log.entity_ref ?? "—"}</Td>
                  <Td className="max-w-xs truncate text-xs text-ink-muted">
                    {log.details ?? "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Duplicate attempts"
          description="Registrations blocked because the mobile number or Aadhaar already existed."
        />
        {duplicates.length === 0 ? (
          <EmptyState title="No duplicate attempts recorded" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Attempted name</Th>
                <Th>Field</Th>
                <Th>Value</Th>
                <Th>Existing record</Th>
                <Th>Operator</Th>
              </tr>
            </thead>
            <tbody>
              {duplicates.map((attempt) => (
                <tr key={attempt.id} className="hover:bg-gray-50">
                  <Td className="whitespace-nowrap text-ink-muted">
                    {formatDateTime(attempt.created_at)}
                  </Td>
                  <Td className="font-medium">{attempt.attempted_name ?? "—"}</Td>
                  <Td>
                    <Badge tone="danger">{attempt.field}</Badge>
                  </Td>
                  <Td className="tabular">{attempt.masked_value}</Td>
                  <Td className="tabular">{attempt.existing_code ?? "—"}</Td>
                  <Td>{attempt.attempted_by_name ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
