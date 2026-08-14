"use client";

import { useRouter } from "next/navigation";

const SORT_OPTIONS = [
  { value: "date_desc", label: "Registered (Newest)" },
  { value: "name", label: "Name (A – Z)" },
  { value: "city", label: "City (A – Z)" },
  { value: "customers_desc", label: "Customers (High – Low)" },
  { value: "members_desc", label: "Members (High – Low)" },
];

export function SortSelect({ q, sort }: { q: string; sort: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 shrink-0">
      <label htmlFor="members-sort" className="text-xs font-medium text-ink-muted whitespace-nowrap">
        Sort by
      </label>
      <select
        id="members-sort"
        value={sort}
        onChange={(e) =>
          router.push(`?q=${encodeURIComponent(q)}&sort=${e.target.value}`)
        }
        className="text-xs border border-line rounded-md px-2.5 py-1.5 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
