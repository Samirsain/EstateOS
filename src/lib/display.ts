/**
 * Renders a stored Aadhaar last-4 as a masked number for display. The full
 * value only ever leaves the database through an explicit decrypt on the edit
 * and print paths.
 */
export function maskLast4(last4: string): string {
  return `XXXX XXXX ${last4}`;
}
