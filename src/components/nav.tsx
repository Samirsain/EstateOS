"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  mdOnly?: boolean;
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map((item) => {
        const active =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              active
                ? "bg-[#0066cc] text-white shadow-sm"
                : "text-[#7a7a7a] hover:bg-black/5 hover:text-[#1d1d1f]"
            }`}
          >
            {item.label}
            {item.mdOnly ? (
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                active ? "bg-white/20 text-white" : "bg-[#e0e0e0] text-[#1d1d1f]"
              }`}>
                MD
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
