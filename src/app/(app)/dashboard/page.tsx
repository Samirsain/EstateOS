import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card, CardHeader, LinkButton, PageHeader } from "@/components/ui";
import { GrowthChart, TopMembersChart } from "@/components/charts";
import { requireUser } from "@/lib/auth";
import { getDashboardStats, getGrowthSeries, getTopMembers } from "@/lib/queries";

export const metadata: Metadata = { title: "Dashboard" };

/* SQLite reads are cheap but the numbers must never be stale. */
export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  href?: string;
  tone?: "default" | "alert";
}) {
  const body = (
    <>
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold ${
          tone === "alert" && value > 0 ? "text-danger" : "text-ink"
        }`}
      >
        {value.toLocaleString("en-IN")}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </>
  );

  const className =
    "block rounded-xl border border-line bg-surface p-5 shadow-sm transition";

  return href ? (
    <Link href={href} className={`${className} hover:border-brand-500`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireUser();
  const { denied } = await searchParams;

  const [stats, growth, topMembers] = await Promise.all([
    getDashboardStats(),
    getGrowthSeries(30),
    getTopMembers(8),
  ]);

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Office overview for member registration, customer onboarding and referral ownership."
        action={<LinkButton href="/members/new">Register member</LinkButton>}
      />

      {denied ? (
        <div className="mb-5">
          <Alert tone="warning" title="That area is restricted">
            Your role ({user.role}) does not have access to that page. Settings
            is Managing Director only.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total customers"
          value={stats.totalCustomers}
          href="/customers"
        />
        <StatCard label="Total members" value={stats.totalMembers} href="/members" />
        <StatCard
          label="Investors"
          value={stats.investors}
          href="/customers?type=Investor"
        />
        <StatCard label="Users" value={stats.users} href="/customers?type=User" />
        <StatCard
          label="Today's registrations"
          value={stats.todayCustomers}
          hint={`${stats.todayMembers} member${stats.todayMembers === 1 ? "" : "s"} registered today`}
        />
        <StatCard
          label="Duplicate attempts blocked"
          value={stats.duplicateAttempts}
          hint={`${stats.duplicateAttemptsToday} today`}
          tone="alert"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Registration growth"
            description="Daily customer and member registrations over the last 30 days."
          />
          <GrowthChart points={growth} />
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Top performing members"
            description="Members ranked by customers referred."
          />
          <TopMembersChart members={topMembers} />
        </Card>
      </div>
    </>
  );
}
