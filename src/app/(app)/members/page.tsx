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

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePermission("members.view");
  const { q = "" } = await searchParams;
  const members = listMembers(q);

  return (
    <>
      <PageHeader
        title="Members"
        description="Offline referral partners. Each member owns the customers they refer."
        action={<LinkButton href="/members/new" variant="primary">Register member</LinkButton>}
      />

      <Card>
        <div className="border-b border-line px-5 py-4 no-print">
          <SearchBar
            placeholder="Search by name, mobile, Member ID, invite code, city…"
            defaultValue={q}
          />
        </div>

        {members.length === 0 ? (
          <EmptyState
            title={q ? "No members match that search" : "No members registered yet"}
            description={
              q
                ? "Try a different name, mobile number or Member ID."
                : "Register the first referral partner to start assigning customers."
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
                <Th>Invite code</Th>
                <Th className="text-right">Customers</Th>
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
                      <p className="text-xs text-ink-muted">
                        {member.company_name}
                      </p>
                    ) : null}
                  </Td>
                  <Td className="tabular">{member.mobile}</Td>
                  <Td>{member.city ?? "—"}</Td>
                  <Td>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold tracking-wider">
                      {member.invite_code}
                    </code>
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
