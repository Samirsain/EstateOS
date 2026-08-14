import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { listMembers } from "@/lib/queries";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Register member" };

export default async function NewMemberPage() {
  await requirePermission("members.create");
  const members = await listMembers();

  return (
    <>
      <PageHeader
        title="Register member"
        description="Create a referral partner record. The system assigns the Member ID and invite code."
      />
      <Card className="p-6">
        <MemberForm mode="create" activeMembers={members} />
      </Card>
    </>
  );
}
