import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { decryptField } from "@/lib/crypto";
import { getMemberByCode, listMembers } from "@/lib/queries";
import { MemberForm } from "../../member-form";

export const metadata: Metadata = { title: "Edit member" };

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requirePermission("members.edit");
  const { code } = await params;
  const member = await getMemberByCode(decodeURIComponent(code));
  if (!member) notFound();

  const allMembers = await listMembers();
  const activeMembers = allMembers.filter((m) => m.id !== member.id);

  return (
    <>
      <PageHeader
        title="Edit member"
        description={`Member ID ${member.member_code}`}
      />
      <Card className="p-6">
        <MemberForm
          mode="edit"
          activeMembers={activeMembers}
          values={{
            memberCode: member.member_code,
            name: member.name,
            mobile: member.mobile,
            alternateMobile: member.alternate_mobile ?? "",
            city: member.city ?? "",
            companyName: member.company_name ?? "",
            dealsIn: JSON.parse(member.deals_in || "[]"),
            experience: member.experience ?? "",
            reraNo: member.rera_no ?? "",
            email: member.email ?? "",
            referredByMemberId: member.referred_by_member_id
              ? String(member.referred_by_member_id)
              : "",
            aadhaar: decryptField(member.aadhaar_encrypted),
          }}
        />
      </Card>
    </>
  );
}
