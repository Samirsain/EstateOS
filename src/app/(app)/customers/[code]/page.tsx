import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  DescriptionList,
  LinkButton,
  PageHeader,
  formatDateTime,
} from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { can, requirePermission } from "@/lib/auth";
import { formatAadhaarForUser } from "@/lib/display";
import { getCustomerByCode } from "@/lib/queries";
import { deleteCustomerAction } from "../actions";

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

  return (
    <>
      <PageHeader
        title={customer.name}
        description={`Customer ID ${customer.customer_code}`}
        action={
          <LinkButton href={`/customers/${customer.customer_code}/print`}>
            Print form
          </LinkButton>
        }
      />

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
        </div>

        <Card className="h-fit">
          <CardHeader title="Referral ownership" />
          <div className="space-y-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Owned by member
              </p>
              <Link
                href={`/members/${customer.member_code}`}
                className="mt-1 block text-sm font-medium text-brand-600 hover:underline"
              >
                {customer.member_name}
              </Link>
              <p className="tabular text-xs text-ink-muted">
                {customer.member_code}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Referral code used
              </p>
              <p className="mt-1 text-sm font-semibold tracking-[0.15em] text-ink">
                {customer.invite_code}
              </p>
            </div>
          </div>
        </Card>

        {can(user.role, "customers.delete") ? (
          <Card className="h-fit lg:col-start-3">
            <CardHeader
              title="Managing Director controls"
              description="Deleting removes the customer permanently. This cannot be undone."
            />
            <div className="p-5">
              <form action={deleteCustomerAction}>
                <input
                  type="hidden"
                  name="customerCode"
                  value={customer.customer_code}
                />
                <ConfirmButton
                  variant="danger"
                  className="w-full"
                  confirmMessage={`Permanently delete ${customer.name} (${customer.customer_code})? This cannot be undone.`}
                >
                  Delete customer
                </ConfirmButton>
              </form>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
