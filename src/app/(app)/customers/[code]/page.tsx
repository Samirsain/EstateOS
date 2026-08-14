import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  DescriptionList,
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
import { getCustomerByCode } from "@/lib/queries";
import { promoteCustomerToMemberAction, toggleBlacklistCustomerAction } from "../actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: `Customer ${code}` };
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requirePermission("customers.view");
  const { code } = await params;
  const { created } = await searchParams;

  const customer = await getCustomerByCode(decodeURIComponent(code));
  if (!customer) notFound();

  const canDeleteCustomer = await can(user.role, "customers.delete");

  return (
    <>
      <PageHeader
        title={customer.name}
        description={`Customer ID ${customer.customer_code}`}
        action={
          <div className="flex flex-wrap items-center gap-2">


            {!customer.promoted_to_member_id && (
              <form action={promoteCustomerToMemberAction} className="inline">
                <input
                  type="hidden"
                  name="customerCode"
                  value={customer.customer_code}
                />
                <ConfirmButton
                  variant="primary"
                  confirmMessage={`Promote customer ${customer.name} (${customer.customer_code}) directly to a Full Member?`}
                >
                  🚀 Promote to Member
                </ConfirmButton>
              </form>
            )}

            {canDeleteCustomer && (
              <form action={toggleBlacklistCustomerAction} className="inline">
                <input
                  type="hidden"
                  name="customerCode"
                  value={customer.customer_code}
                />
                <ConfirmButton
                  variant="danger"
                  confirmMessage={
                    customer.is_blacklisted
                      ? `Unblacklist ${customer.name} (${customer.customer_code})?`
                      : `Blacklist ${customer.name} (${customer.customer_code}) across all real estate projects?`
                  }
                >
                  {customer.is_blacklisted ? "Restore Customer" : "⛔ Blacklist Customer"}
                </ConfirmButton>
              </form>
            )}
          </div>
        }
      />

      {customer.is_blacklisted && (
        <div className="mb-5">
          <Alert tone="danger" title="⛔ Customer Blacklisted Across All Projects">
            This customer is blacklisted. All plot allotments and bookings are automatically blocked by the system.
          </Alert>
        </div>
      )}

      {customer.promoted_to_member_id && (
        <div className="mb-5">
          <Alert tone="positive" title="🚀 Promoted to Full Member">
            This customer has been successfully upgraded to a Full Member profile.
          </Alert>
        </div>
      )}

      {created ? (
        <div className="mb-5">
          <Alert tone="positive" title="Customer registered successfully.">
            Customer ID <strong>{customer.customer_code}</strong> is permanently
            assigned to {customer.member_name} ({customer.member_code}).
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Customer information" />
            <div className="p-5">
              <DescriptionList
                items={[
                  {
                    label: "Customer ID",
                    value: <span className="tabular">{customer.customer_code}</span>,
                  },
                  { label: "Name", value: customer.name },
                  {
                    label: "Mobile number",
                    value: <span className="tabular">{customer.mobile}</span>,
                  },
                  {
                    label: "Type",
                    value: (
                      <Badge
                        tone={
                          customer.customer_type === "Investor"
                            ? "brand"
                            : "neutral"
                        }
                      >
                        {customer.customer_type}
                      </Badge>
                    ),
                  },
                  {
                    label: "Aadhaar number",
                    value: (
                      <span className="tabular font-semibold text-ink">
                        {formatAadhaarForUser(user.role, customer.aadhaar_encrypted, customer.aadhaar_last4)}
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
                    value: formatDateTime(customer.created_at),
                  },
                ]}
              />
            </div>
          </Card>

          {customer.referred_customers && customer.referred_customers.length > 0 ? (
            <Card>
              <CardHeader title="Referred customers" />
              <Table>
                <thead>
                  <tr>
                    <Th>Customer ID</Th>
                    <Th>Name</Th>
                    <Th>Mobile</Th>
                    <Th>Registered</Th>
                  </tr>
                </thead>
                <tbody>
                  {customer.referred_customers.map((rc) => (
                    <tr key={rc.id} className="hover:bg-gray-50">
                      <Td>
                        <Link
                          href={`/customers/${rc.customer_code}`}
                          className="tabular font-medium text-brand-600 hover:underline"
                        >
                          {rc.customer_code}
                        </Link>
                      </Td>
                      <Td className="font-medium text-ink">{rc.name}</Td>
                      <Td className="tabular">{rc.mobile}</Td>
                      <Td className="whitespace-nowrap text-ink-muted">
                        {formatDate(rc.created_at)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit">
          <CardHeader title="Referral details" />
          <div className="space-y-3 p-5">
            {customer.member_name ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Member
                </p>
                <Link
                  href={`/members/${customer.member_code}`}
                  className="mt-1 block text-sm font-semibold text-brand-600 hover:underline"
                >
                  {customer.member_name} ({customer.member_code})
                </Link>
              </div>
            ) : null}

            {customer.referred_by_customer_name ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Referred by Customer
                </p>
                <Link
                  href={`/customers/${customer.referred_by_customer_code}`}
                  className="mt-1 block text-sm font-semibold text-brand-600 hover:underline"
                >
                  {customer.referred_by_customer_name} ({customer.referred_by_customer_code})
                </Link>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}
