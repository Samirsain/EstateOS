import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { decryptField } from "@/lib/crypto";
import { getMemberByCode } from "@/lib/queries";
import { MemberForm } from "../../member-form";

export const metadata: Metadata = { title: "Edit member" };

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requirePermission("members.edit");
  const { code } = await params;
  const member = getMemberByCode(decodeURIComponent(code));
  if (!member) notFound();

  return (
    <>
      <PageHeader
        title="Edit member"
        description={`Member ID ${member.member_code} · invite code ${member.invite_code}`}
      />
      <Card className="p-6">
        <MemberForm
          mode="edit"
          values={{
            memberCode: member.member_code,
            name: member.name,
            dealerName: member.dealer_name ?? "",
            mobile: member.mobile,
            alternateMobile: member.alternate_mobile ?? "",
            city: member.city ?? "",
            companyName: member.company_name ?? "",
            dealsIn: JSON.parse(member.deals_in || "[]"),
            experience: member.experience ?? "",
            aadhaar: decryptField(member.aadhaar_encrypted),
          }}
        />
      </Card>
    </>
  );
}
