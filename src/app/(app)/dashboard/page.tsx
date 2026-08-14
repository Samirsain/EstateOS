import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card, CardHeader, LinkButton, PageHeader } from "@/components/ui";
import { GrowthChart, TopMembersChart } from "@/components/charts";
import { requireUser } from "@/lib/auth";
import { getDashboardStats, getGrowthSeries, getTopMembers } from "@/lib/queries";

export const metadata: Metadata = { title: "Dashboard" };

/* The counts are batched into a single $transaction, and must never be stale. */
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
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7a7a7a] truncate">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span
          className={`text-xl font-semibold tracking-tight-apple ${
            tone === "alert" && value > 0 ? "text-rose-600" : "text-[#1d1d1f]"
          }`}
        >
          {value.toLocaleString("en-IN")}
        </span>
        {hint ? <span className="text-[10px] text-[#7a7a7a] truncate font-normal">{hint}</span> : null}
      </div>
    </div>
  );

  const className =
    "block rounded-[14px] border border-[#e0e0e0] bg-white px-3.5 py-2.5 transition-all hover:border-[#0066cc]/40 hover:shadow-xs active:scale-[0.98]";

  return href ? (
    <Link href={href} className={className}>
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
        <div className="mb-4">
          <Alert tone="warning" title="That area is restricted">
            Your role ({user.role}) does not have access to that page. Settings
            is Managing Director only.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total customers"
          value={stats.totalCustomers}
          href="/customers"
        />
        <StatCard label="Total members" value={stats.totalMembers} href="/members" />
        <StatCard
          label="Total Plots"
          value={stats.totalPlots}
          hint={`${stats.availablePlots} Avail • ${stats.holdPlots} Hold`}
          href="/plots"
        />
        <StatCard
          label="Sold Plots"
          value={stats.allottedPlots}
          hint={`${stats.allottedPlots} sold`}
          href="/plots"
        />
        <StatCard
          label="Investors"
          value={stats.investors}
          href="/customers?type=Investor"
        />
        <StatCard label="Users" value={stats.users} href="/customers?type=User" />
        <StatCard
          label="Today's registrations"
          value={stats.todayCustomers}
          hint={`${stats.todayMembers} members today`}
        />
        <StatCard
          label="Duplicate attempts"
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
