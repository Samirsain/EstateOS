import { NextResponse, type NextRequest } from "next/server";
import { recordAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth";
import { maskLast4 } from "@/lib/display";
import {
  listAuditLogs,
  listCustomers,
  listMembers,
  listTransfers,
} from "@/lib/queries";
import {
  getMemberPerformance,
  isReportPeriod,
  resolveRange,
} from "@/lib/reports";
import { formatIdDate } from "@/lib/ids";

/**
 * Serialises a row set to CSV. Values are quoted and internal quotes doubled;
 * a value that could be read as a formula by a spreadsheet is prefixed with a
 * single quote so it is imported as text.
 */
function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (value: string | number | null): string => {
    const text = value === null || value === undefined ? "" : String(value);
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  return [headers, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can(user.role, "reports.export")) {
    return NextResponse.json({ error: "Not permitted" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const dataset = params.get("dataset") ?? "customers";
  const periodParam = params.get("period") ?? "monthly";
  const period = isReportPeriod(periodParam) ? periodParam : "monthly";
  const range = resolveRange(period, params.get("date") ?? undefined);

  let headers: string[];
  let rows: (string | number | null)[][];

  switch (dataset) {
    case "members": {
      headers = [
        "Member ID",
        "Name",
        "Dealer name",
        "Mobile",
        "Alternate mobile",
        "City",
        "Company",
        "Deals in",
        "Experience",
        "Aadhaar",
        "Invite code",
        "Customers referred",
        "Status",
        "Registered on",
      ];
      rows = listMembers().map((member) => [
        member.member_code,
        member.name,
        member.dealer_name,
        member.mobile,
        member.alternate_mobile,
        member.city,
        member.company_name,
        (JSON.parse(member.deals_in || "[]") as string[]).join(" / "),
        member.experience,
        maskLast4(member.aadhaar_last4),
        member.invite_code,
        member.customer_count,
        member.is_active ? "Active" : "Inactive",
        member.created_at,
      ]);
      break;
    }

    case "transfers": {
      headers = [
        "Date",
        "Customer ID",
        "Customer",
        "From member",
        "To member",
        "Reason",
        "Transferred by",
      ];
      rows = listTransfers(1000).map((transfer) => [
        transfer.created_at,
        transfer.customer_code,
        transfer.customer_name,
        `${transfer.from_code} ${transfer.from_name}`,
        `${transfer.to_code} ${transfer.to_name}`,
        transfer.reason,
        transfer.transferred_by_name,
      ]);
      break;
    }

    case "audit": {
      if (!can(user.role, "audit.view")) {
        return NextResponse.json({ error: "Not permitted" }, { status: 403 });
      }
      headers = ["Date", "Actor", "Role", "Action", "Entity", "Reference", "Details"];
      rows = listAuditLogs({ limit: 5000 }).map((log) => [
        log.created_at,
        log.actor_name,
        log.actor_role,
        log.action,
        log.entity,
        log.entity_ref,
        log.details,
      ]);
      break;
    }

    case "member-performance": {
      headers = ["Member ID", "Name", "City", "Customers", "Investors"];
      rows = getMemberPerformance(range).map((row) => [
        row.member_code,
        row.name,
        row.city,
        row.customers,
        row.investors,
      ]);
      break;
    }

    case "customers":
    default: {
      headers = [
        "Customer ID",
        "Name",
        "Mobile",
        "Type",
        "Aadhaar",
        "Member ID",
        "Member name",
        "Invite code",
        "Registered on",
      ];
      rows = listCustomers({ from: range.from, to: range.to }).map((customer) => [
        customer.customer_code,
        customer.name,
        customer.mobile,
        customer.customer_type,
        maskLast4(customer.aadhaar_last4),
        customer.member_code,
        customer.member_name,
        customer.invite_code,
        customer.created_at,
      ]);
      break;
    }
  }

  recordAudit({
    actor: user,
    action: "report.exported",
    entity: dataset,
    entityRef: `${range.from}..${range.to}`,
    details: { period, rows: rows.length },
  });

  const filename = `cmms-${dataset}-${formatIdDate()}.csv`;
  /* UTF-8 BOM so Excel opens the file with the right encoding. */
  const body = `﻿${toCsv(headers, rows)}`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
