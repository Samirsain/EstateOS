import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  formatDate,
} from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { requirePermission } from "@/lib/auth";
import { listCustomers } from "@/lib/queries";
import {
  REPORT_PERIODS,
  getMemberPerformance,
  getReportBuckets,
  getReportSummary,
  isReportPeriod,
  resolveRange,
} from "@/lib/reports";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

function bucketLabel(bucket: string): string {
  if (bucket.length === 7) {
    return new Date(`${bucket}-01T00:00:00Z`).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return new Date(`${bucket}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string }>;
}) {
  await requirePermission("reports.view");
  const { period: periodParam, date } = await searchParams;
  const period = isReportPeriod(periodParam ?? "") ? periodParam! : "monthly";
  const range = resolveRange(
    period as "daily" | "weekly" | "monthly" | "yearly",
    date,
  );

  const summary = getReportSummary(range);
  const buckets = getReportBuckets(range);
  const performance = getMemberPerformance(range);
  const customers = listCustomers({ from: range.from, to: range.to });

  const exportQuery = new URLSearchParams({ period, date: date ?? "" });

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${REPORT_PERIODS.find((item) => item.value === period)?.label} report · ${range.label}`}
        action={
          <>
            <PrintButton />
            <a
              href={`/api/export?dataset=customers&${exportQuery}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface px-3.5 py-2 text-sm font-medium text-ink ring-1 ring-inset ring-line transition hover:bg-gray-50"
            >
              Export customers (Excel)
            </a>
            <a
              href={`/api/export?dataset=member-performance&${exportQuery}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Export performance (Excel)
            </a>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-1 no-print">
        {REPORT_PERIODS.map((option) => {
          const params = new URLSearchParams({ period: option.value });
          if (date) params.set("date", date);
          const active = option.value === period;
          return (
            <Link
              key={option.value}
              href={`/reports?${params}`}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-muted hover:bg-gray-100 hover:text-ink"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
        <form className="ml-auto flex items-center gap-2" action="/reports">
          <input type="hidden" name="period" value={period} />
          <label htmlFor="date" className="text-sm text-ink-muted">
            As of
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={date ?? range.to}
            className="rounded-lg border-0 bg-surface px-3 py-2 text-sm ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-surface px-3 py-2 text-sm font-medium ring-1 ring-inset ring-line hover:bg-gray-50"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Customers" value={summary.customers} />
        <Metric label="Members" value={summary.members} />
        <Metric label="Investors" value={summary.investors} />
        <Metric label="Users" value={summary.users} />
        <Metric label="Duplicates blocked" value={summary.duplicatesBlocked} />
        <Metric label="Transfers" value={summary.transfers} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Registrations breakdown"
            description={range.bucket === "month" ? "By month" : "By day"}
          />
          {buckets.length === 0 ? (
            <EmptyState
              title="No registrations in this period"
              description="Pick a different period or date."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{range.bucket === "month" ? "Month" : "Date"}</Th>
                  <Th className="text-right">Customers</Th>
                  <Th className="text-right">Investors</Th>
                  <Th className="text-right">Members</Th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((bucket) => (
                  <tr key={bucket.bucket}>
                    <Td>{bucketLabel(bucket.bucket)}</Td>
                    <Td className="tabular text-right">{bucket.customers}</Td>
                    <Td className="tabular text-right">{bucket.investors}</Td>
                    <Td className="tabular text-right">{bucket.members}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Member performance"
            description="Members ranked by customers referred in this period."
          />
          {performance.length === 0 ? (
            <EmptyState title="No referrals in this period" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>City</Th>
                  <Th className="text-right">Customers</Th>
                  <Th className="text-right">Investors</Th>
                </tr>
              </thead>
              <tbody>
                {performance.map((row) => (
                  <tr key={row.member_code}>
                    <Td>
                      <Link
                        href={`/members/${row.member_code}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {row.name}
                      </Link>
                      <p className="tabular text-xs text-ink-muted">
                        {row.member_code}
                      </p>
                    </Td>
                    <Td>{row.city ?? "—"}</Td>
                    <Td className="tabular text-right font-medium">
                      {row.customers}
                    </Td>
                    <Td className="tabular text-right">{row.investors}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title="Customers registered in this period"
          description={`${customers.length} record${customers.length === 1 ? "" : "s"} between ${formatDate(range.from)} and ${formatDate(range.to)}.`}
        />
        {customers.length === 0 ? (
          <EmptyState title="No customers registered in this period" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer ID</Th>
                <Th>Name</Th>
                <Th>Mobile</Th>
                <Th>Type</Th>
                <Th>Member</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <Td className="tabular">{customer.customer_code}</Td>
                  <Td className="font-medium">{customer.name}</Td>
                  <Td className="tabular">{customer.mobile}</Td>
                  <Td>{customer.customer_type}</Td>
                  <Td>
                    {customer.member_name}
                    <p className="tabular text-xs text-ink-muted">
                      {customer.member_code}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {formatDate(customer.created_at)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold text-ink">
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}
