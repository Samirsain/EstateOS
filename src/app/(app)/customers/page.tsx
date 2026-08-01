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
import { listCustomers } from "@/lib/queries";
import { CUSTOMER_TYPES } from "@/lib/types";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  await requirePermission("customers.view");
  const { q = "", type = "" } = await searchParams;
  const customers = listCustomers({ search: q, type });

  return (
    <>
      <PageHeader
        title="Customers"
        description="Every customer is permanently owned by the member who referred them."
        action={
          <LinkButton href="/customers/new" variant="primary">
            Register customer
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 no-print">
          <div className="min-w-64 flex-1">
            <SearchBar
              placeholder="Search by name, mobile, Customer ID, member, Aadhaar last 4…"
              defaultValue={q}
            />
          </div>
          <div className="flex gap-1">
            <TypeFilter current={type} label="All" value="" q={q} />
            {CUSTOMER_TYPES.map((option) => (
              <TypeFilter
                key={option}
                current={type}
                label={option}
                value={option}
                q={q}
              />
            ))}
          </div>
        </div>

        {customers.length === 0 ? (
          <EmptyState
            title={
              q || type ? "No customers match those filters" : "No customers yet"
            }
            description={
              q || type
                ? "Try a different search term or clear the type filter."
                : "Register a customer against the member who referred them."
            }
            action={
              q || type ? null : (
                <LinkButton href="/customers/new" variant="primary">
                  Register customer
                </LinkButton>
              )
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer ID</Th>
                <Th>Name</Th>
                <Th>Mobile</Th>
                <Th>Type</Th>
                <Th>Owned by</Th>
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
                        customer.customer_type === "Investor" ? "brand" : "neutral"
                      }
                    >
                      {customer.customer_type}
                    </Badge>
                  </Td>
                  <Td>
                    <Link
                      href={`/members/${customer.member_code}`}
                      className="text-brand-600 hover:underline"
                    >
                      {customer.member_name}
                    </Link>
                    <p className="tabular text-xs text-ink-muted">
                      {customer.member_code}
                    </p>
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

      <p className="mt-3 text-xs text-ink-muted">
        Showing {customers.length} customer{customers.length === 1 ? "" : "s"}.
      </p>
    </>
  );
}

function TypeFilter({
  current,
  label,
  value,
  q,
}: {
  current: string;
  label: string;
  value: string;
  q: string;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (value) params.set("type", value);
  const active = current === value;

  return (
    <Link
      href={`/customers${params.size ? `?${params}` : ""}`}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-ink-muted hover:bg-gray-100 hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
