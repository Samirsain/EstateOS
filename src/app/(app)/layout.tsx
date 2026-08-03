import { Badge } from "@/components/ui";
import { SidebarNav, type NavItem } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "../login/actions";

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
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
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              CM
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink">
              CMMS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight text-ink">
                {user.name}
              </p>
              <p className="text-xs leading-tight text-ink-muted">
                @{user.username}
              </p>
            </div>
            <Badge tone={user.role === "MD" ? "brand" : "neutral"}>
              {user.role}
            </Badge>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-muted transition hover:bg-gray-100 hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0 no-print">
          <SidebarNav items={items} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
