import { getDb } from "./db";
import type {
  AuditLogRow,
  CustomerRow,
  CustomerWithMember,
  DuplicateAttemptRow,
  MemberRow,
  UserRow,
} from "./types";

export interface MemberListItem extends MemberRow {
  customer_count: number;
}

export async function listMembers(search = ""): Promise<MemberListItem[]> {
  const trimmed = search.trim();
  const db = await getDb();

  const result = await db.execute({
    sql: `SELECT m.*, COUNT(c.id) AS customer_count
            FROM members m
            LEFT JOIN customers c ON c.member_id = m.id
           WHERE (@search = '' OR m.name LIKE @term OR m.mobile LIKE @term
                  OR m.member_code LIKE @term OR m.invite_code LIKE @term
                  OR IFNULL(m.dealer_name, '') LIKE @term
                  OR IFNULL(m.company_name, '') LIKE @term
                  OR IFNULL(m.city, '') LIKE @term)
           GROUP BY m.id
           ORDER BY m.id DESC`,
    args: { search: trimmed, term: `%${trimmed}%` },
  });

  return result.rows as unknown as MemberListItem[];
}

export async function getMemberByCode(
  code: string,
): Promise<MemberListItem | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT m.*, COUNT(c.id) AS customer_count
            FROM members m
            LEFT JOIN customers c ON c.member_id = m.id
           WHERE m.member_code = ?
           GROUP BY m.id`,
    args: [code],
  });
  return result.rows[0] as unknown as MemberListItem | undefined;
}

export async function getMemberById(id: number): Promise<MemberRow | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM members WHERE id = ?",
    args: [id],
  });
  return result.rows[0] as unknown as MemberRow | undefined;
}

/** Active members, for the "assign to member" dropdown on customer forms. */
export async function listActiveMembersForSelect(): Promise<
  Pick<MemberRow, "id" | "member_code" | "name" | "invite_code" | "mobile">[]
> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT id, member_code, name, invite_code, mobile
       FROM members WHERE is_active = 1 ORDER BY name COLLATE NOCASE`,
  );
  return result.rows as unknown as Pick<
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
  const term = `%${search}%`;
  const conditions: string[] = [];
  const params: Record<string, string | number> = {};

  if (search) {
    conditions.push(
      `(c.name LIKE @term OR c.mobile LIKE @term OR c.customer_code LIKE @term
        OR c.invite_code LIKE @term OR c.aadhaar_last4 = @exact
        OR m.name LIKE @term OR m.member_code LIKE @term)`,
    );
    params.term = term;
    params.exact = search.replace(/\D/g, "").slice(-4);
  }
  if (filters.type) {
    conditions.push("c.customer_type = @type");
    params.type = filters.type;
  }
  if (filters.memberId) {
    conditions.push("c.member_id = @memberId");
    params.memberId = filters.memberId;
  }
  if (filters.from) {
    conditions.push("date(c.created_at) >= date(@from)");
    params.from = filters.from;
  }
  if (filters.to) {
    conditions.push("date(c.created_at) <= date(@to)");
    params.to = filters.to;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const db = await getDb();

  const result = await db.execute({
    sql: `SELECT c.*, m.name AS member_name, m.member_code AS member_code
            FROM customers c
            JOIN members m ON m.id = c.member_id
            ${where}
           ORDER BY c.id DESC`,
    args: params,
  });

  return result.rows as unknown as CustomerWithMember[];
}

export async function getCustomerByCode(
  code: string,
): Promise<CustomerWithMember | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT c.*, m.name AS member_name, m.member_code AS member_code
            FROM customers c
            JOIN members m ON m.id = c.member_id
           WHERE c.customer_code = ?`,
    args: [code],
  });
  return result.rows[0] as unknown as CustomerWithMember | undefined;
}

export async function getCustomerById(
  id: number,
): Promise<CustomerRow | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM customers WHERE id = ?",
    args: [id],
  });
  return result.rows[0] as unknown as CustomerRow | undefined;
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
  transfers: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  const one = async (sql: string): Promise<number> => {
    const result = await db.execute(sql);
    return Number(result.rows[0]?.value ?? 0);
  };

  const [
    totalCustomers,
    totalMembers,
    investors,
    users,
    todayCustomers,
    todayMembers,
    duplicateAttempts,
    duplicateAttemptsToday,
    transfers,
  ] = await Promise.all([
    one("SELECT COUNT(*) AS value FROM customers"),
    one("SELECT COUNT(*) AS value FROM members"),
    one("SELECT COUNT(*) AS value FROM customers WHERE customer_type = 'Investor'"),
    one("SELECT COUNT(*) AS value FROM customers WHERE customer_type = 'User'"),
    one("SELECT COUNT(*) AS value FROM customers WHERE date(created_at) = date('now')"),
    one("SELECT COUNT(*) AS value FROM members WHERE date(created_at) = date('now')"),
    one("SELECT COUNT(*) AS value FROM duplicate_attempts"),
    one("SELECT COUNT(*) AS value FROM duplicate_attempts WHERE date(created_at) = date('now')"),
    one("SELECT COUNT(*) AS value FROM transfers"),
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
    transfers,
  };
}

export interface GrowthPoint {
  day: string;
  customers: number;
  members: number;
}

/**
 * Registrations per day for the last `days` days. The day spine is generated in
 * SQL so days with no registrations still appear as zero rather than being
 * dropped from the series.
 */
export async function getGrowthSeries(days = 30): Promise<GrowthPoint[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `WITH RECURSIVE spine(day, n) AS (
            SELECT date('now', '-' || (@days - 1) || ' day'), 1
            UNION ALL
            SELECT date(day, '+1 day'), n + 1 FROM spine WHERE n < @days
          )
          SELECT spine.day AS day,
                 (SELECT COUNT(*) FROM customers WHERE date(created_at) = spine.day) AS customers,
                 (SELECT COUNT(*) FROM members   WHERE date(created_at) = spine.day) AS members
            FROM spine
           ORDER BY spine.day`,
    args: { days },
  });

  return result.rows.map((row) => ({
    day: String(row.day),
    customers: Number(row.customers),
    members: Number(row.members),
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
  const result = await db.execute({
    sql: `SELECT m.member_code, m.name, m.city,
                 COUNT(c.id) AS customers,
                 SUM(CASE WHEN c.customer_type = 'Investor' THEN 1 ELSE 0 END) AS investors
            FROM members m
            LEFT JOIN customers c ON c.member_id = m.id
           GROUP BY m.id
          HAVING customers > 0
           ORDER BY customers DESC, m.name COLLATE NOCASE
           LIMIT ?`,
    args: [limit],
  });

  return result.rows.map((row) => ({
    member_code: String(row.member_code),
    name: String(row.name),
    city: row.city === null ? null : String(row.city),
    customers: Number(row.customers),
    investors: Number(row.investors),
  }));
}

export async function listDuplicateAttempts(
  limit = 100,
): Promise<(DuplicateAttemptRow & { attempted_by_name: string | null })[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT d.*, u.name AS attempted_by_name
            FROM duplicate_attempts d
            LEFT JOIN users u ON u.id = d.attempted_by
           ORDER BY d.id DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as (DuplicateAttemptRow & {
    attempted_by_name: string | null;
  })[];
}

export interface AuditFilters {
  action?: string;
  entity?: string;
  limit?: number;
}

export async function listAuditLogs(
  filters: AuditFilters = {},
): Promise<AuditLogRow[]> {
  const conditions: string[] = [];
  const params: Record<string, string | number> = {
    limit: filters.limit ?? 200,
  };

  if (filters.action) {
    conditions.push("action LIKE @action");
    params.action = `${filters.action}%`;
  }
  if (filters.entity) {
    conditions.push("entity = @entity");
    params.entity = filters.entity;
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const db = await getDb();

  const result = await db.execute({
    sql: `SELECT * FROM audit_logs ${where} ORDER BY id DESC LIMIT @limit`,
    args: params,
  });

  return result.rows as unknown as AuditLogRow[];
}

export interface TransferListItem {
  id: number;
  customer_code: string;
  customer_name: string;
  from_code: string;
  from_name: string;
  to_code: string;
  to_name: string;
  reason: string | null;
  transferred_by_name: string;
  created_at: string;
}

export async function listTransfers(limit = 100): Promise<TransferListItem[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT t.id, t.reason, t.created_at,
                 c.customer_code, c.name AS customer_name,
                 f.member_code AS from_code, f.name AS from_name,
                 g.member_code AS to_code,   g.name AS to_name,
                 u.name AS transferred_by_name
            FROM transfers t
            JOIN customers c ON c.id = t.customer_id
            JOIN members   f ON f.id = t.from_member_id
            JOIN members   g ON g.id = t.to_member_id
            JOIN users     u ON u.id = t.transferred_by
           ORDER BY t.id DESC LIMIT ?`,
    args: [limit],
  });

  return result.rows as unknown as TransferListItem[];
}

export interface CustomerTransferHistoryRow {
  id: number;
  customer_id: number;
  from_member_id: number;
  to_member_id: number;
  reason: string | null;
  transferred_by: number;
  created_at: string;
  from_code: string;
  from_name: string;
  to_code: string;
  to_name: string;
  actor_name: string;
}

export async function listTransfersForCustomer(
  customerId: number,
): Promise<CustomerTransferHistoryRow[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT t.*, f.member_code AS from_code, f.name AS from_name,
                 g.member_code AS to_code, g.name AS to_name, u.name AS actor_name
            FROM transfers t
            JOIN members f ON f.id = t.from_member_id
            JOIN members g ON g.id = t.to_member_id
            JOIN users   u ON u.id = t.transferred_by
           WHERE t.customer_id = ?
           ORDER BY t.id DESC`,
    args: [customerId],
  });
  return result.rows as unknown as CustomerTransferHistoryRow[];
}

export async function listUsers(): Promise<UserRow[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT * FROM users ORDER BY role, username COLLATE NOCASE",
  );
  return result.rows as unknown as UserRow[];
}
