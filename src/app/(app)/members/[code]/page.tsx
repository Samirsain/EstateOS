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
import { can, requirePermission } from "@/lib/auth";
import { ConfirmButton } from "@/components/confirm-button";
import { formatAadhaarForUser } from "@/lib/display";
import { countVerifiedCustomerSales, ROYALTY_CUSTOMER_THRESHOLD } from "@/lib/referrals";
import { getMemberByCode, listCustomers } from "@/lib/queries";
import { setMemberActiveAction, toggleBlacklistMemberAction } from "../actions";

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

  const [canDeleteMember, canEditMember, verifiedSales] = await Promise.all([
    can(user.role, "members.delete"),
    can(user.role, "members.edit"),
    countVerifiedCustomerSales(member.id),
  ]);

  return (
    <>
      <PageHeader
        title={member.name}
        description={`Member ID ${member.member_code}`}
        action={
          <div className="flex items-center gap-2">

            {canEditMember && (
              <LinkButton href={`/members/${member.member_code}/edit`}>
                Edit
              </LinkButton>
            )}
            {canDeleteMember && (
              <>
                <form action={setMemberActiveAction} className="inline">
                  <input type="hidden" name="memberCode" value={member.member_code} />
                  <input type="hidden" name="active" value={member.is_active ? "0" : "1"} />
                  <Button type="submit" variant={member.is_active ? "secondary" : "secondary"}>
                    {member.is_active ? "Deactivate" : "Reactivate"}
                  </Button>
                </form>
                <form action={toggleBlacklistMemberAction} className="inline">
                  <input type="hidden" name="memberCode" value={member.member_code} />
                  <ConfirmButton
                    variant={member.is_blacklisted ? "secondary" : "danger"}
                    confirmMessage={
                      member.is_blacklisted
                        ? `Remove ${member.name} (${member.member_code}) from the global blacklist?`
                        : `Blacklist ${member.name} (${member.member_code}) across all real estate projects? Their mobile and Aadhaar will be refused at every future registration and allotment.`
                    }
                  >
                    {member.is_blacklisted ? "Remove Blacklist" : "⛔ Blacklist Member"}
                  </ConfirmButton>
                </form>
              </>
            )}
          </div>
        }
      />

      {member.is_blacklisted ? (
        <div className="mb-5">
          <Alert tone="danger" title="⛔ Member Blacklisted Across All Projects">
            This member is on the global blacklist. Their mobile number and
            Aadhaar are refused at every registration and plot allotment.
          </Alert>
        </div>
      ) : null}

      {verifiedSales >= ROYALTY_CUSTOMER_THRESHOLD ? (
        <div className="mb-5">
          <Alert tone="positive" title="👑 Royalty Status Unlocked!">
            This member has <strong>{verifiedSales} customers with completed plot
            purchases</strong> and has unlocked Royalty status privileges.
          </Alert>
        </div>
      ) : (
        <div className="mb-5">
          <Alert tone="warning" title="Royalty progress">
            <strong>{verifiedSales}</strong> of {ROYALTY_CUSTOMER_THRESHOLD}{" "}
            customers have completed a plot purchase. Registered customers only
            count once their allotment is done.
          </Alert>
        </div>
      )}

      {created ? (
        <div className="mb-5">
          <Alert tone="positive" title="Member registered successfully.">
            The Member ID <strong>{member.member_code}</strong> is registered.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-1">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Member information"
              action={
                member.is_blacklisted ? (
                  <Badge tone="danger">Blacklisted</Badge>
                ) : member.is_active ? (
                  <Badge tone="positive">Active</Badge>
                ) : (
                  <Badge tone="warning">Inactive</Badge>
                )
              }
            />
            <div className="p-5 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 xl:col-span-8">
                <DescriptionList
                  items={[
                    { label: "Member ID", value: <span className="tabular font-bold text-brand-700">{member.member_code}</span> },
                    { label: "Name", value: <span className="font-semibold">{member.name}</span> },
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
                      label: "Email",
                      value: member.email ? (
                        <a href={`mailto:${member.email}`} className="text-brand-600 font-medium hover:underline">{member.email}</a>
                      ) : "—",
                    },
                    {
                      label: "RERA No.",
                      value: member.rera_no ? (
                        <span className="tabular font-semibold text-brand-700">{member.rera_no}</span>
                      ) : (
                        "—"
                      ),
                    },
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
                      label: "Referred by",
                      value: member.referred_by_name ? (
                        <Link
                          href={`/members/${member.referred_by_code}`}
                          className="font-semibold text-brand-600 hover:underline"
                        >
                          {member.referred_by_name} ({member.referred_by_code})
                        </Link>
                      ) : (
                        <span className="text-ink-muted font-medium">3% Club</span>
                      ),
                    },
                    {
                      label: "Members referred",
                      value: (
                        <span className="tabular font-bold text-ink">
                          {member.referred_members?.length ?? 0}
                        </span>
                      ),
                    },
                    {
                      label: "Referred customers",
                      value: (
                        <span className="tabular font-bold text-ink">
                          {member.customer_count}
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

              {/* Right Column: Ultra-Minimal Referred Members Panel */}
              <div className="lg:col-span-5 xl:col-span-4 rounded-[18px] border border-[#e0e0e0] bg-white p-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#f0f0f0] mb-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7a7a7a]">
                    Referred Members
                  </h4>
                  <span className="text-xs font-bold text-[#0066cc]">
                    {member.referred_members?.length ?? 0}
                  </span>
                </div>

                {!member.referred_members || member.referred_members.length === 0 ? (
                  <p className="text-xs text-[#7a7a7a] py-4 text-center">No members referred</p>
                ) : (
                  <div className="space-y-1 max-h-[360px] overflow-y-auto pr-0.5">
                    {member.referred_members.map((rm, idx) => {
                      const isEligible = rm.is_commission_eligible ?? idx < 3;
                      return (
                        <Link
                          key={rm.id}
                          href={`/members/${rm.member_code}`}
                          className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#f5f5f7] transition duration-150 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-xs font-bold text-[#0066cc]">
                              {rm.member_code}
                            </span>
                            <span className="text-xs font-semibold text-[#1d1d1f] truncate">
                              {rm.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isEligible ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                1st-3rd Commission
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-[#7a7a7a] bg-gray-100 px-1.5 py-0.5 rounded">
                                Lineage Only
                              </span>
                            )}
                            <span className="text-xs text-[#7a7a7a] group-hover:text-[#0066cc] transition">
                              →
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Referred customers" />
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
                    <Th>Plot Details</Th>
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
                        {customer.plot_number ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center rounded bg-[#1d1d1f] px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                                PLOT #{customer.plot_number}
                              </span>
                              {customer.plot_block && (
                                <span className="text-[11px] font-semibold text-[#0066cc] bg-[#f0f6ff] px-1.5 py-0.5 rounded border border-[#e0edff]">
                                  BLOCK {customer.plot_block}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-ink-muted">
                              {customer.project_name ? <span>{customer.project_name}</span> : null}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-muted italic">No plot allotted yet</span>
                        )}
                      </Td>
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
      </div>
    </>
  );
}
