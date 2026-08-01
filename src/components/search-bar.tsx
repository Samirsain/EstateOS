"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { inputClass } from "./ui";

/**
 * Debounced search that writes the term into the URL, so results stay
 * shareable, bookmarkable and printable.
 */
export function SearchBar({
  placeholder,
  defaultValue = "",
  paramName = "q",
}: {
  placeholder: string;
  defaultValue?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const current = searchParams.get(paramName) ?? "";
    if (current === value) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(paramName, value);
      else params.delete(paramName);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [value, searchParams, paramName, pathname, router]);

  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={inputClass}
      />
      {isPending ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
          Searching…
        </span>
      ) : null}
    </div>
  );
}
