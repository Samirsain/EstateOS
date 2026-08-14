import type { Metadata } from "next";
import Link from "next/link";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
  formatDate,
} from "@/components/ui";
import { SearchBar } from "@/components/search-bar";
import { requirePermission } from "@/lib/auth";
import { listMembers } from "@/lib/queries";
import type { MemberListItem } from "@/lib/queries";
import { SortSelect } from "./sort-select";

export const metadata: Metadata = { title: "Members" };

type SortKey = "name" | "city" | "customers_desc" | "members_desc" | "date_desc";

function sortMembers(members: MemberListItem[], sort: SortKey): MemberListItem[] {
  return [...members].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "city":
        return (a.city ?? "").localeCompare(b.city ?? "");
      case "customers_desc":
        return b.customer_count - a.customer_count;
      case "members_desc":
        return (b.referred_members_count ?? 0) - (a.referred_members_count ?? 0);
      case "date_desc":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
}



export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  await requirePermission("members.view");
  const { q = "", sort = "date_desc" } = await searchParams;
  const rawMembers = await listMembers(q);
  const members = sortMembers(rawMembers, sort as SortKey);

  return (
    <>
      <PageHeader
        title="Members"
        description="Referral members list. Each member owns the customers they refer."
        action={<LinkButton href="/members/new" variant="primary">Register member</LinkButton>}
      />

      <Card>
        <div className="border-b border-line px-5 py-4 no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <SearchBar
              placeholder="Search by name, mobile, Member ID, city…"
              defaultValue={q}
            />
          </div>
          <SortSelect q={q} sort={sort} />
        </div>

        {members.length === 0 ? (
          <EmptyState
            title={q ? "No members match that search" : "No members registered yet"}
            description={
              q
                ? "Try a different name, mobile number or Member ID."
                : "Register the first member to start assigning customers."
            }
            action={
              q ? null : (
                <LinkButton href="/members/new" variant="primary">
                  Register member
                </LinkButton>
              )
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Member ID</Th>
                <Th>Name</Th>
                <Th>Mobile</Th>
                <Th>City</Th>
                <Th className="text-right">Referred Members</Th>
                <Th className="text-right">Referred Customers</Th>
                <Th>Registered</Th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <Td>
                    <Link
                      href={`/members/${member.member_code}`}
                      className="tabular font-medium text-brand-600 hover:underline"
                    >
                      {member.member_code}
                    </Link>
                  </Td>
                  <Td>
                    <span className="font-medium text-ink">{member.name}</span>
                    {member.is_active ? null : (
                      <span className="ml-2">
                        <Badge tone="warning">Inactive</Badge>
                      </span>
                    )}
                    {member.company_name ? (
                      <p className="text-xs text-ink-muted">{member.company_name}</p>
                    ) : null}
                  </Td>
                  <Td className="tabular">{member.mobile}</Td>
                  <Td>{member.city ?? "—"}</Td>
                  <Td className="tabular text-right font-medium">
                    {member.referred_members_count ?? 0}
                  </Td>
                  <Td className="tabular text-right font-medium">
                    {member.customer_count}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">
                    {formatDate(member.created_at)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <p className="mt-3 text-xs text-ink-muted">
        Showing {members.length} member{members.length === 1 ? "" : "s"}.
      </p>
    </>
  );
}
