import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
  formatDate,
  formatDateTime,
} from "@/components/ui";
import { can, requirePermission } from "@/lib/auth";
import { maskLast4 } from "@/lib/display";
import { getMemberByCode, listCustomers } from "@/lib/queries";
import { setMemberActiveAction } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: `Member ${code}` };
}

export default async function MemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requirePermission("members.view");
  const { code } = await params;
  const { created } = await searchParams;

  const member = await getMemberByCode(decodeURIComponent(code));
  if (!member) notFound();

  const customers = await listCustomers({ memberId: member.id });
  const dealsIn: string[] = JSON.parse(member.deals_in || "[]");

  return (
    <>
      <PageHeader
        title={member.name}
        description={`Member ID ${member.member_code}`}
        action={
          <>
            <LinkButton href={`/members/${member.member_code}/print`}>
              Print form
            </LinkButton>
            <LinkButton href={`/members/${member.member_code}/edit`}>
              Edit
            </LinkButton>
            <LinkButton
              href={`/customers/new?member=${member.member_code}`}
              variant="primary"
            >
              Register customer
            </LinkButton>
          </>
        }
      />

      {created ? (
        <div className="mb-5">
          <Alert tone="positive" title="Member registered successfully.">
            Share invite code <strong>{member.invite_code}</strong> with{" "}
            {member.name}. Customers referred with this code are permanently
            assigned to this member.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader
              title="Member information"
              action={
                member.is_active ? (
                  <Badge tone="positive">Active</Badge>
                ) : (
                  <Badge tone="warning">Inactive</Badge>
                )
              }
            />
            <div className="p-5">
              <DescriptionList
                items={[
                  { label: "Member ID", value: <span className="tabular">{member.member_code}</span> },
                  { label: "Name", value: member.name },
                  { label: "Dealer name", value: member.dealer_name ?? "—" },
                  { label: "Mobile", value: <span className="tabular">{member.mobile}</span> },
                  {
                    label: "Alternate mobile",
                    value: member.alternate_mobile ? (
                      <span className="tabular">{member.alternate_mobile}</span>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "City", value: member.city ?? "—" },
                  { label: "Company name", value: member.company_name ?? "—" },
                  { label: "Experience", value: member.experience ?? "—" },
                  {
                    label: "Deals in",
                    value: dealsIn.length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {dealsIn.map((deal) => (
                          <Badge key={deal} tone="brand">
                            {deal}
                          </Badge>
                        ))}
                      </span>
                    ) : (
                      "—"
                    ),
                  },
                  {
                    label: "Aadhaar number",
                    value: (
                      <span className="tabular">
                        {maskLast4(member.aadhaar_last4)}
                        <span className="ml-2 text-xs text-ink-muted">
                          (encrypted at rest)
                        </span>
                      </span>
                    ),
                  },
                  {
                    label: "Registered on",
                    value: formatDateTime(member.created_at),
                  },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Referred customers"
              description={`${member.customer_count} customer${member.customer_count === 1 ? "" : "s"} permanently assigned to this member.`}
            />
            {customers.length === 0 ? (
              <EmptyState
                title="No customers yet"
                description="Customers referred by this member will appear here once the PC registers them."
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Customer ID</Th>
                    <Th>Name</Th>
                    <Th>Mobile</Th>
                    <Th>Type</Th>
                    <Th>Registered</Th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <Td>
                        <Link
                          href={`/customers/${customer.customer_code}`}
                          className="tabular font-medium text-brand-600 hover:underline"
                        >
                          {customer.customer_code}
                        </Link>
                      </Td>
                      <Td className="font-medium">{customer.name}</Td>
                      <Td className="tabular">{customer.mobile}</Td>
                      <Td>
                        <Badge
                          tone={
                            customer.customer_type === "Investor"
                              ? "brand"
                              : "neutral"
                          }
                        >
                          {customer.customer_type}
                        </Badge>
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
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Referral invite code" />
            <div className="p-5 text-center">
              <p className="rounded-lg bg-brand-50 py-4 text-2xl font-bold tracking-[0.2em] text-brand-700">
                {member.invite_code}
              </p>
              <p className="mt-3 text-xs text-ink-muted">
                The member quotes this code when referring a customer. It never
                changes.
              </p>
            </div>
          </Card>

          {can(user.role, "members.delete") ? (
            <Card>
              <CardHeader
                title="Managing Director controls"
                description="Members are deactivated, never deleted, so referral history stays intact."
              />
              <div className="p-5">
                <form action={setMemberActiveAction}>
                  <input
                    type="hidden"
                    name="memberCode"
                    value={member.member_code}
                  />
                  <input
                    type="hidden"
                    name="active"
                    value={member.is_active ? "0" : "1"}
                  />
                  <Button
                    type="submit"
                    variant={member.is_active ? "danger" : "secondary"}
                  >
                    {member.is_active
                      ? "Deactivate member"
                      : "Reactivate member"}
                  </Button>
                </form>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
