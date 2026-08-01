"use client";

import type { ReactNode } from "react";
import { Button, LinkButton } from "./ui";

/**
 * Wraps a printable registration form. The toolbar is hidden by the print
 * stylesheet, so "Print / Save as PDF" produces a clean single-page document.
 */
export function PrintSheet({
  backHref,
  children,
}: {
  backHref: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mb-4 flex gap-2 no-print">
        <Button type="button" onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
        <LinkButton href={backHref}>Back</LinkButton>
      </div>
      <div className="print-sheet mx-auto max-w-3xl rounded-xl border border-line bg-surface p-8 shadow-sm">
        {children}
      </div>
    </>
  );
}
