import { Badge } from "@/components/ui";
import { SidebarNav, type NavItem } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "../login/actions";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/plots", label: "Plots Inventory" },
  { href: "/members", label: "Members" },
  { href: "/customers", label: "Customers" },
  { href: "/settings", label: "Settings", mdOnly: true },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const items = NAV_ITEMS.filter((item) => !item.mdOnly || user.role === "MD");

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      {/* Header — Apple Frosted Bar */}
      <header className="sticky top-0 z-40 border-b border-[#e0e0e0] bg-white/80 backdrop-blur-md no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#0066cc] text-[11px] font-bold text-white shadow-sm">
              3%
            </span>
            <span className="text-xs font-semibold tracking-tight-apple text-[#1d1d1f]">
              3% Real Estate
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-[#1d1d1f]">
                {user.name}
              </p>
              <p className="text-[10px] text-[#7a7a7a]">
                @{user.username}
              </p>
            </div>
            <Badge tone={user.role === "MD" ? "brand" : "neutral"}>
              {user.role}
            </Badge>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-[#e0e0e0] px-3 py-1 text-xs font-medium text-[#1d1d1f] transition-all hover:bg-[#f5f5f7] active:scale-95"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row">
        <aside className="lg:w-52 lg:shrink-0 no-print">
          <SidebarNav items={items} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
