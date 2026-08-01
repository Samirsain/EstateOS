/** Normalises an Indian mobile number to 10 digits, dropping +91 / 0 prefixes. */
export function normaliseMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function isValidMobile(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normaliseMobile(raw));
}

export function normaliseAadhaar(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Aadhaar is 12 digits and must pass the Verhoeff checksum used by UIDAI.
 * The first digit is never 0 or 1.
 */
export function isValidAadhaar(raw: string): boolean {
  const digits = normaliseAadhaar(raw);
  if (!/^[2-9]\d{11}$/.test(digits)) return false;
  return verhoeffCheck(digits);
}

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function verhoeffCheck(digits: string): boolean {
  let checksum = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i += 1) {
    checksum = VERHOEFF_D[checksum][VERHOEFF_P[i % 8][Number(reversed[i])]];
  }
  return checksum === 0;
}

export function formatAadhaar(raw: string): string {
  const digits = normaliseAadhaar(raw);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function requireText(
  value: FormDataEntryValue | null,
  { max = 120 }: { max?: number } = {},
): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

export function getAllValues(form: FormData, field: string): string[] {
  return form
    .getAll(field)
    .map((value) => String(value).trim())
    .filter(Boolean);
}
