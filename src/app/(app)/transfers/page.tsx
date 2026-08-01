import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Table,
  Td,
  Th,
  formatDateTime,
} from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import {
  listActiveMembersForSelect,
  listCustomers,
  listTransfers,
} from "@/lib/queries";
import { TransferForm } from "./transfer-form";

export const metadata: Metadata = { title: "Ownership transfers" };
export const dynamic = "force-dynamic";

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  await requirePermission("customers.transfer");
  const { customer } = await searchParams;

  const customers = listCustomers();
  const members = listActiveMembersForSelect();
  const transfers = listTransfers();

  return (
    <>
      <PageHeader
        title="Ownership transfers"
        description="Only the Managing Director can move a customer to a different member. Every transfer is logged."
      />

      <Card className="mb-5">
        <CardHeader title="Transfer a customer" />
        <div className="p-5">
          <TransferForm
            customers={customers.map((row) => ({
              customer_code: row.customer_code,
              name: row.name,
              mobile: row.mobile,
              member_code: row.member_code,
              member_name: row.member_name,
            }))}
            members={members.map((row) => ({
              member_code: row.member_code,
              name: row.name,
            }))}
            defaultCustomerCode={customer ?? ""}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Transfer history"
          description={`${transfers.length} transfer${transfers.length === 1 ? "" : "s"} recorded.`}
        />
        {transfers.length === 0 ? (
          <EmptyState
            title="No transfers yet"
            description="Every customer still belongs to the member who originally referred them."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th>Reason</Th>
                <Th>By</Th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-gray-50">
                  <Td className="whitespace-nowrap text-ink-muted">
                    {formatDateTime(transfer.created_at)}
                  </Td>
                  <Td>
                    <Link
                      href={`/customers/${transfer.customer_code}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {transfer.customer_name}
                    </Link>
                    <p className="tabular text-xs text-ink-muted">
                      {transfer.customer_code}
                    </p>
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
                  <Td>{transfer.transferred_by_name}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
