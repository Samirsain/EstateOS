import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { listActiveMembersForSelect } from "@/lib/queries";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Register customer" };

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  await requirePermission("customers.create");
  const { member } = await searchParams;
  const members = listActiveMembersForSelect();

  return (
    <>
      <PageHeader
        title="Register customer"
        description="Mobile and Aadhaar are checked against every existing customer before an ID is issued."
      />
      <Card className="p-6">
        <CustomerForm
          members={members.map((row) => ({
            member_code: row.member_code,
            name: row.name,
            invite_code: row.invite_code,
            mobile: row.mobile,
          }))}
          defaultMemberCode={member ?? ""}
        />
      </Card>
    </>
  );
}
