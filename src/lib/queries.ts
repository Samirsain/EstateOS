import { getDb } from "./db";
import type { CustomerRow, CustomerWithMember, MemberRow, UserRow } from "./types";

export interface MemberListItem extends MemberRow {
  customer_count: number;
}

export async function listMembers(search = ""): Promise<MemberListItem[]> {
  const trimmed = search.trim();
  const db = await getDb();

  const members = await db.members.findMany({
    where: trimmed
      ? {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { mobile: { contains: trimmed } },
            { member_code: { contains: trimmed, mode: "insensitive" } },
            { invite_code: { contains: trimmed, mode: "insensitive" } },
            { company_name: { contains: trimmed, mode: "insensitive" } },
            { city: { contains: trimmed, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      _count: { select: { customers: true } },
    },
    orderBy: { id: "desc" },
  });

  return members.map((m) => ({
    ...m,
    customer_count: m._count.customers,
    created_at: m.created_at.toISOString(),
  })) as unknown as MemberListItem[];
}

export async function getMemberByCode(
  code: string,
): Promise<MemberListItem | undefined> {
  const db = await getDb();
  const m = await db.members.findUnique({
    where: { member_code: code },
    include: {
      _count: { select: { customers: true } },
    },
  });

  if (!m) return undefined;

  return {
    ...m,
    customer_count: m._count.customers,
    created_at: m.created_at.toISOString(),
  } as unknown as MemberListItem;
}

export async function getMemberById(id: number): Promise<MemberRow | undefined> {
  const db = await getDb();
  const m = await db.members.findUnique({ where: { id } });
  if (!m) return undefined;
  return {
    ...m,
    created_at: m.created_at.toISOString(),
  } as unknown as MemberRow;
}

/** Active members, for the "assign to member" dropdown on customer forms. */
export async function listActiveMembersForSelect(): Promise<
  Pick<MemberRow, "id" | "member_code" | "name" | "invite_code" | "mobile">[]
> {
  const db = await getDb();
  const members = await db.members.findMany({
    where: { is_active: 1 },
    select: {
      id: true,
      member_code: true,
      name: true,
      invite_code: true,
      mobile: true,
    },
    orderBy: { name: "asc" },
  });

  return members as unknown as Pick<
    MemberRow,
    "id" | "member_code" | "name" | "invite_code" | "mobile"
  >[];
}

export interface CustomerFilters {
  search?: string;
  type?: string;
  memberId?: number;
  from?: string;
  to?: string;
}

export async function listCustomers(
  filters: CustomerFilters = {},
): Promise<CustomerWithMember[]> {
  const search = (filters.search ?? "").trim();
  const exactLast4 = search.replace(/\D/g, "").slice(-4);
  const db = await getDb();

  const whereConditions: any[] = [];

  if (search) {
    whereConditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { customer_code: { contains: search, mode: "insensitive" } },
        { invite_code: { contains: search, mode: "insensitive" } },
        ...(exactLast4 ? [{ aadhaar_last4: exactLast4 }] : []),
        { member: { name: { contains: search, mode: "insensitive" } } },
        { member: { member_code: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.type) {
    whereConditions.push({ customer_type: filters.type });
  }

  if (filters.memberId) {
    whereConditions.push({ member_id: filters.memberId });
  }

  if (filters.from) {
    whereConditions.push({ created_at: { gte: new Date(filters.from) } });
  }

  if (filters.to) {
    const toDate = new Date(filters.to);
    toDate.setHours(23, 59, 59, 999);
    whereConditions.push({ created_at: { lte: toDate } });
  }

  const customers = await db.customers.findMany({
    where: whereConditions.length ? { AND: whereConditions } : undefined,
    include: { member: true },
    orderBy: { id: "desc" },
  });

  return customers.map((c) => ({
    ...c,
    member_name: c.member?.name ?? null,
    member_code: c.member?.member_code ?? null,
    created_at: c.created_at.toISOString(),
  })) as unknown as CustomerWithMember[];
}

export async function getCustomerByCode(
  code: string,
): Promise<CustomerWithMember | undefined> {
  const db = await getDb();
  const c = await db.customers.findUnique({
    where: { customer_code: code },
    include: { member: true },
  });

  if (!c) return undefined;

  return {
    ...c,
    member_name: c.member?.name ?? null,
    member_code: c.member?.member_code ?? null,
    created_at: c.created_at.toISOString(),
  } as unknown as CustomerWithMember;
}

export async function getCustomerById(
  id: number,
): Promise<CustomerRow | undefined> {
  const db = await getDb();
  const c = await db.customers.findUnique({ where: { id } });
  if (!c) return undefined;
  return {
    ...c,
    created_at: c.created_at.toISOString(),
  } as unknown as CustomerRow;
}

export interface DashboardStats {
  totalCustomers: number;
  totalMembers: number;
  investors: number;
  users: number;
  todayCustomers: number;
  todayMembers: number;
  duplicateAttempts: number;
  duplicateAttemptsToday: number;
  totalPlots: number;
  availablePlots: number;
  holdPlots: number;
  allottedPlots: number;
  totalInventoryValue: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalCustomers,
    totalMembers,
    investors,
    users,
    todayCustomers,
    todayMembers,
    duplicateAttempts,
    duplicateAttemptsToday,
    totalPlots,
    availablePlots,
    holdPlots,
    allottedPlots,
    priceSum,
  ] = await db.$transaction([
    db.customers.count(),
    db.members.count(),
    db.customers.count({ where: { customer_type: "Investor" } }),
    db.customers.count({ where: { customer_type: "User" } }),
    db.customers.count({ where: { created_at: { gte: startOfToday } } }),
    db.members.count({ where: { created_at: { gte: startOfToday } } }),
    db.duplicate_attempts.count(),
    db.duplicate_attempts.count({ where: { created_at: { gte: startOfToday } } }),
    db.plots.count(),
    db.plots.count({ where: { status: "Available" } }),
    db.plots.count({ where: { status: "Hold" } }),
    db.plots.count({ where: { status: { in: ["Booked", "Allotted"] } } }),
    db.plots.aggregate({ _sum: { total_price: true } }),
  ]);

  return {
    totalCustomers,
    totalMembers,
    investors,
    users,
    todayCustomers,
    todayMembers,
    duplicateAttempts,
    duplicateAttemptsToday,
    totalPlots,
    availablePlots,
    holdPlots,
    allottedPlots,
    totalInventoryValue: priceSum._sum.total_price ?? 0,
  };
}

export interface GrowthPoint {
  day: string;
  customers: number;
  members: number;
}

export async function getGrowthSeries(days = 30): Promise<GrowthPoint[]> {
  const db = await getDb();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const [customers, members] = await Promise.all([
    db.customers.findMany({
      where: { created_at: { gte: startDate } },
      select: { created_at: true },
    }),
    db.members.findMany({
      where: { created_at: { gte: startDate } },
      select: { created_at: true },
    }),
  ]);

  const series: Record<string, { customers: number; members: number }> = {};

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    series[dateStr] = { customers: 0, members: 0 };
  }

  for (const c of customers) {
    const dateStr = c.created_at.toISOString().slice(0, 10);
    if (series[dateStr]) series[dateStr].customers++;
  }

  for (const m of members) {
    const dateStr = m.created_at.toISOString().slice(0, 10);
    if (series[dateStr]) series[dateStr].members++;
  }

  return Object.entries(series).map(([day, val]) => ({
    day,
    customers: val.customers,
    members: val.members,
  }));
}

export interface TopMember {
  member_code: string;
  name: string;
  city: string | null;
  customers: number;
  investors: number;
}

export async function getTopMembers(limit = 8): Promise<TopMember[]> {
  const db = await getDb();
  const members = await db.members.findMany({
    include: {
      customers: true,
    },
  });

  const list: TopMember[] = members
    .map((m) => ({
      member_code: m.member_code,
      name: m.name,
      city: m.city,
      customers: m.customers.length,
      investors: m.customers.filter((c) => c.customer_type === "Investor").length,
    }))
    .filter((m) => m.customers > 0)
    .sort((a, b) => b.customers - a.customers)
    .slice(0, limit);

  return list;
}

export async function listProjects(): Promise<import("./types").ProjectRow[]> {
  const db = await getDb();
  const projects = await db.projects.findMany({
    orderBy: { id: "desc" },
  });
  return projects.map((p) => ({
    ...p,
    created_at: p.created_at.toISOString(),
  })) as unknown as import("./types").ProjectRow[];
}

export interface PlotFilters {
  search?: string;
  projectId?: number;
  status?: string;
  facing?: string;
}

export async function listPlots(filters: PlotFilters = {}): Promise<import("./types").PlotWithDetails[]> {
  const db = await getDb();
  const search = (filters.search ?? "").trim();

  const whereConditions: any[] = [];

  if (search) {
    whereConditions.push({
      OR: [
        { plot_number: { contains: search, mode: "insensitive" } },
        { plot_code: { contains: search, mode: "insensitive" } },
        { block: { contains: search, mode: "insensitive" } },
        { project: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.projectId) {
    whereConditions.push({ project_id: filters.projectId });
  }

  if (filters.status) {
    whereConditions.push({ status: filters.status });
  }

  if (filters.facing) {
    whereConditions.push({ facing: filters.facing });
  }

  const plots = await db.plots.findMany({
    where: whereConditions.length ? { AND: whereConditions } : undefined,
    include: {
      project: true,
      allotment: {
        include: {
          customer: true,
          member: true,
        },
      },
    },
    orderBy: { id: "desc" },
  });

  return plots.map((p) => ({
    ...p,
    project_name: p.project.name,
    project_location: p.project.location,
    allotment_code: p.allotment?.allotment_code ?? null,
    booking_amount: p.allotment?.booking_amount ?? null,
    payment_status: p.allotment?.payment_status ?? null,
    customer_name: p.allotment?.customer.name ?? null,
    customer_code: p.allotment?.customer.customer_code ?? null,
    member_name: p.allotment?.member?.name ?? null,
    member_code: p.allotment?.member?.member_code ?? null,
    created_at: p.created_at.toISOString(),
  })) as unknown as import("./types").PlotWithDetails[];
}

export async function getPlotByCode(code: string): Promise<import("./types").PlotWithDetails | undefined> {
  const db = await getDb();
  const p = await db.plots.findUnique({
    where: { plot_code: code },
    include: {
      project: true,
      allotment: {
        include: {
          customer: true,
          member: true,
        },
      },
    },
  });

  if (!p) return undefined;

  return {
    ...p,
    project_name: p.project.name,
    project_location: p.project.location,
    allotment_code: p.allotment?.allotment_code ?? null,
    booking_amount: p.allotment?.booking_amount ?? null,
    payment_status: p.allotment?.payment_status ?? null,
    customer_name: p.allotment?.customer.name ?? null,
    customer_code: p.allotment?.customer.customer_code ?? null,
    member_name: p.allotment?.member?.name ?? null,
    member_code: p.allotment?.member?.member_code ?? null,
    created_at: p.created_at.toISOString(),
  } as unknown as import("./types").PlotWithDetails;
}

export async function listPlotAllotments(): Promise<import("./types").PlotAllotmentWithDetails[]> {
  const db = await getDb();
  const allotments = await db.plot_allotments.findMany({
    include: {
      plot: {
        include: { project: true },
      },
      customer: true,
      member: true,
    },
    orderBy: { id: "desc" },
  });

  return allotments.map((pa) => ({
    ...pa,
    plot_number: pa.plot.plot_number,
    plot_code: pa.plot.plot_code,
    project_name: pa.plot.project.name,
    customer_name: pa.customer.name,
    customer_code: pa.customer.customer_code,
    customer_mobile: pa.customer.mobile,
    member_name: pa.member?.name ?? null,
    member_code: pa.member?.member_code ?? null,
    allotment_date: pa.allotment_date.toISOString(),
    created_at: pa.created_at.toISOString(),
  })) as unknown as import("./types").PlotAllotmentWithDetails[];
}

export async function getActivePlotsForSelect(): Promise<import("./types").PlotWithDetails[]> {
  const db = await getDb();
  const plots = await db.plots.findMany({
    where: { status: { in: ["Available", "Hold"] } },
    include: { project: true },
    orderBy: { plot_number: "asc" },
  });

  return plots.map((p) => ({
    ...p,
    project_name: p.project.name,
    project_location: p.project.location,
    created_at: p.created_at.toISOString(),
  })) as unknown as import("./types").PlotWithDetails[];
}

export async function listUsers(): Promise<UserRow[]> {
  const db = await getDb();
  const users = await db.users.findMany({
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });
  return users.map((u) => ({
    ...u,
    created_at: u.created_at.toISOString(),
  })) as unknown as UserRow[];
}
