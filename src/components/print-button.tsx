"use client";

import { Button } from "./ui";

/** Prints the current page; the browser's print dialog handles "Save as PDF". */
export function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
