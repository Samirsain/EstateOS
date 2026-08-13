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
import { ConfirmButton } from "@/components/confirm-button";
import { can, requirePermission } from "@/lib/auth";
import { formatAadhaarForUser } from "@/lib/display";
import { getMemberByCode, listCustomers } from "@/lib/queries";
import { deleteMemberAction, setMemberActiveAction } from "../actions";

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

  const canDeleteMember = await can(user.role, "members.delete");

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
          </>
        }
      />

      {created ? (
        <div className="mb-5">
          <Alert tone="positive" title="Member registered successfully.">
            The Member ID <strong>{member.member_code}</strong> is also{" "}
            {member.name}&apos;s referral code — share it with them directly.
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
                      <span className="tabular font-semibold text-ink">
                        {formatAadhaarForUser(user.role, member.aadhaar_encrypted, member.aadhaar_last4)}
                        {user.role === "MD" ? (
                          <span className="ml-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            MD Full View
                          </span>
                        ) : (
                          <span className="ml-2 text-xs text-ink-muted">(masked)</span>
                        )}
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
            <CardHeader title="Referral code" />
            <div className="p-5 text-center">
              <p className="tabular rounded-lg bg-brand-50 py-4 text-2xl font-bold text-brand-700">
                {member.invite_code}
              </p>
              <p className="mt-3 text-xs text-ink-muted">
                This is the member&apos;s Member ID — quote it when referring a
                customer.
              </p>
            </div>
          </Card>

          {canDeleteMember ? (
            <Card>
              <CardHeader
                title="Managing Director controls"
                description="Deleting removes the member permanently. This cannot be undone."
              />
              <div className="space-y-3 p-5">
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
                    className="w-full"
                  >
                    {member.is_active
                      ? "Deactivate member"
                      : "Reactivate member"}
                  </Button>
                </form>

                {member.customer_count === 0 ? (
                  <form action={deleteMemberAction}>
                    <input
                      type="hidden"
                      name="memberCode"
                      value={member.member_code}
                    />
                    <ConfirmButton
                      variant="danger"
                      className="w-full"
                      confirmMessage={`Permanently delete ${member.name} (${member.member_code})? This cannot be undone.`}
                    >
                      Delete member
                    </ConfirmButton>
                  </form>
                ) : (
                  <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                    Can&apos;t delete — {member.customer_count} customer
                    {member.customer_count === 1 ? " is" : "s are"} still
                    assigned to this member. Deactivate instead, or delete
                    those customers first.
                  </p>
                )}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
