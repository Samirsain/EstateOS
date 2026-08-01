import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Alert,
  Badge,
  Card,
  CardHeader,
  DescriptionList,
  EmptyState,
  LinkButton,
  PageHeader,
  Table,
  Td,
  Th,
  formatDateTime,
} from "@/components/ui";
import { can, requirePermission } from "@/lib/auth";
import { maskLast4 } from "@/lib/display";
import { getCustomerByCode, listTransfersForCustomer } from "@/lib/queries";

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

  const transfers = await listTransfersForCustomer(customer.id);

  return (
    <>
      <PageHeader
        title={customer.name}
        description={`Customer ID ${customer.customer_code}`}
        action={
          <>
            <LinkButton href={`/customers/${customer.customer_code}/print`}>
              Print form
            </LinkButton>
            {can(user.role, "customers.transfer") ? (
              <LinkButton
                href={`/transfers?customer=${customer.customer_code}`}
                variant="primary"
              >
                Transfer ownership
              </LinkButton>
            ) : null}
          </>
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
                      <span className="tabular">
                        {maskLast4(customer.aadhaar_last4)}
                        <span className="ml-2 text-xs text-ink-muted">
                          (encrypted at rest)
                        </span>
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

          <Card>
            <CardHeader
              title="Ownership history"
              description="Only the Managing Director can move a customer between members."
            />
            {transfers.length === 0 ? (
              <EmptyState
                title="No transfers"
                description="This customer has stayed with the member who originally referred them."
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>From</Th>
                    <Th>To</Th>
                    <Th>Reason</Th>
                    <Th>By</Th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <Td className="whitespace-nowrap text-ink-muted">
                        {formatDateTime(transfer.created_at)}
                      </Td>
                      <Td>
                        {transfer.from_name}
                        <p className="tabular text-xs text-ink-muted">
                          {transfer.from_code}
                        </p>
                      </Td>
                      <Td>
                        {transfer.to_name}
                        <p className="tabular text-xs text-ink-muted">
                          {transfer.to_code}
                        </p>
                      </Td>
                      <Td>{transfer.reason ?? "—"}</Td>
                      <Td>{transfer.actor_name}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
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
                Invite code used
              </p>
              <p className="mt-1 text-sm font-semibold tracking-[0.15em] text-ink">
                {customer.invite_code}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
