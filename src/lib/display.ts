import { decryptField } from "./crypto";

/**
 * Renders a stored Aadhaar last-4 as a masked number for normal users,
 * but decrypts and formats the full 12-digit number for MD role.
 */
export function maskLast4(last4: string): string {
  return `XXXX XXXX ${last4}`;
}

export function formatAadhaarForUser(
  role: string,
  encrypted?: string | null,
  last4?: string | null
): string {
  const safeLast4 = last4 || "XXXX";
  if (role === "MD" && encrypted && encrypted.startsWith("v1.")) {
    try {
      const full = decryptField(encrypted);
      const digits = full.replace(/\D/g, "");
      if (digits.length === 12) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
      }
      if (digits.length > 0) return digits;
    } catch {
      // Fallback if decryption fails
    }
  }
  return `XXXX XXXX ${safeLast4}`;
}
