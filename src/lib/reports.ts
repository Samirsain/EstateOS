import { getDb } from "./db";

export type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";

export const REPORT_PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function isReportPeriod(value: string): value is ReportPeriod {
  return REPORT_PERIODS.some((period) => period.value === value);
}

export interface ReportRange {
  period: ReportPeriod;
  /** Inclusive ISO dates (YYYY-MM-DD). */
  from: string;
  to: string;
  label: string;
  /** Grouping used for the breakdown table. */
  bucket: "day" | "month";
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Resolves a period plus an anchor date into an inclusive date range.
 * Weekly is the trailing 7 days; monthly and yearly are calendar periods.
 */
export function resolveRange(
  period: ReportPeriod,
  anchorDate?: string,
): ReportRange {
  const anchor =
    anchorDate && /^\d{4}-\d{2}-\d{2}$/.test(anchorDate)
      ? new Date(`${anchorDate}T00:00:00Z`)
      : new Date();

  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();

  switch (period) {
    case "daily": {
      const day = iso(anchor);
      return {
        period,
        from: day,
        to: day,
        bucket: "day",
        label: anchor.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }),
      };
    }
    case "weekly": {
      const start = new Date(anchor);
      start.setUTCDate(start.getUTCDate() - 6);
      return {
        period,
        from: iso(start),
        to: iso(anchor),
        bucket: "day",
        label: `7 days to ${anchor.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })}`,
      };
    }
    case "monthly": {
      const start = new Date(Date.UTC(year, month, 1));
      const end = new Date(Date.UTC(year, month + 1, 0));
      return {
        period,
        from: iso(start),
        to: iso(end),
        bucket: "day",
        label: anchor.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }),
      };
    }
    case "yearly": {
      return {
        period,
        from: iso(new Date(Date.UTC(year, 0, 1))),
        to: iso(new Date(Date.UTC(year, 11, 31))),
        bucket: "month",
        label: String(year),
      };
    }
  }
}

export interface ReportSummary {
  customers: number;
  members: number;
  investors: number;
  users: number;
  duplicatesBlocked: number;
  transfers: number;
}

export function getReportSummary(range: ReportRange): ReportSummary {
  const db = getDb();
  const count = (sql: string): number =>
    (
      db.prepare(sql).get({ from: range.from, to: range.to }) as {
        value: number;
      }
    ).value;

  const between = "date(created_at) BETWEEN date(@from) AND date(@to)";

  return {
    customers: count(
      `SELECT COUNT(*) AS value FROM customers WHERE ${between}`,
    ),
    members: count(`SELECT COUNT(*) AS value FROM members WHERE ${between}`),
    investors: count(
      `SELECT COUNT(*) AS value FROM customers WHERE ${between} AND customer_type = 'Investor'`,
    ),
    users: count(
      `SELECT COUNT(*) AS value FROM customers WHERE ${between} AND customer_type = 'User'`,
    ),
    duplicatesBlocked: count(
      `SELECT COUNT(*) AS value FROM duplicate_attempts WHERE ${between}`,
    ),
    transfers: count(
      `SELECT COUNT(*) AS value FROM transfers WHERE ${between}`,
    ),
  };
}

export interface ReportBucket {
  bucket: string;
  customers: number;
  members: number;
  investors: number;
}

export function getReportBuckets(range: ReportRange): ReportBucket[] {
  const format = range.bucket === "month" ? "%Y-%m" : "%Y-%m-%d";
  const between = "date(created_at) BETWEEN date(@from) AND date(@to)";

  return getDb()
    .prepare(
      `SELECT bucket,
              SUM(customers)  AS customers,
              SUM(members)    AS members,
              SUM(investors)  AS investors
         FROM (
           SELECT strftime('${format}', created_at) AS bucket,
                  COUNT(*) AS customers, 0 AS members,
                  SUM(CASE WHEN customer_type = 'Investor' THEN 1 ELSE 0 END) AS investors
             FROM customers WHERE ${between}
            GROUP BY bucket
           UNION ALL
           SELECT strftime('${format}', created_at) AS bucket,
                  0 AS customers, COUNT(*) AS members, 0 AS investors
             FROM members WHERE ${between}
            GROUP BY bucket
         )
        GROUP BY bucket
        ORDER BY bucket`,
    )
    .all({ from: range.from, to: range.to }) as ReportBucket[];
}

export interface MemberPerformanceRow {
  member_code: string;
  name: string;
  city: string | null;
  customers: number;
  investors: number;
}

export function getMemberPerformance(range: ReportRange): MemberPerformanceRow[] {
  return getDb()
    .prepare(
      `SELECT m.member_code, m.name, m.city,
              COUNT(c.id) AS customers,
              SUM(CASE WHEN c.customer_type = 'Investor' THEN 1 ELSE 0 END) AS investors
         FROM members m
         JOIN customers c
           ON c.member_id = m.id
          AND date(c.created_at) BETWEEN date(@from) AND date(@to)
        GROUP BY m.id
        ORDER BY customers DESC, m.name COLLATE NOCASE`,
    )
    .all({ from: range.from, to: range.to }) as MemberPerformanceRow[];
}
