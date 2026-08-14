import { getDb } from "./db";
import { blindIndex } from "./crypto";
import { normaliseMobile, normaliseAadhaar } from "./validation";
import type { SessionUser } from "./types";

/**
 * Global cross-project blacklist engine (SYSTEM_SPECIFICATION §3).
 *
 * Every registration and allotment path routes through `checkBlacklist` so a
 * blocked identity cannot be re-entered through a different screen. Three
 * identity signals are checked:
 *
 *   1. Mobile number         — exact match, hard block.
 *   2. Aadhaar blind index   — exact match on the keyed hash, hard block.
 *   3. Name + city           — soft match, blocked pending MD review because a
 *                              relative's account is the documented evasion route.
 *
 * The registry never stores a plaintext Aadhaar; `aadhaar_index` is the same
 * HMAC blind index used by the members and customers tables, so an exact
 * identity match is possible without holding the number.
 */

export type BlacklistVerdict =
  | { blocked: false }
  | { blocked: true; factor: "mobile" | "aadhaar" | "name_city"; reason: string; message: string };

/** Lowercased, punctuation-stripped, whitespace-collapsed — the fuzzy-match key. */
export function normaliseName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface BlacklistSubject {
  mobile?: string | null;
  aadhaar?: string | null;
  name?: string | null;
  city?: string | null;
  /** Skips the entity's own registry row when re-checking an existing record. */
  ignoreEntity?: { type: "CUSTOMER" | "MEMBER"; id: number };
}

export async function checkBlacklist(
  subject: BlacklistSubject,
): Promise<BlacklistVerdict> {
  const db = await getDb();

  const mobile = subject.mobile ? normaliseMobile(subject.mobile) : "";
  const aadhaar = subject.aadhaar ? normaliseAadhaar(subject.aadhaar) : "";
  const name = subject.name ? normaliseName(subject.name) : "";
  const city = subject.city ? normaliseName(subject.city) : "";

  const signals: Record<string, unknown>[] = [];
  if (mobile) signals.push({ mobile });
  if (aadhaar) signals.push({ aadhaar_index: blindIndex(aadhaar) });
  if (name && city) signals.push({ name_normalised: name, city });

  if (signals.length === 0) return { blocked: false };

  const hits = await db.blacklist_registry.findMany({
    where: {
      OR: signals,
      ...(subject.ignoreEntity
        ? {
            NOT: {
              entity_type: subject.ignoreEntity.type,
              entity_id: subject.ignoreEntity.id,
            },
          }
        : {}),
    },
  });

  if (hits.length === 0) return { blocked: false };

  /* Strongest signal wins, so the operator sees the most defensible reason. */
  const byMobile = mobile ? hits.find((h) => h.mobile === mobile) : undefined;
  if (byMobile) {
    return {
      blocked: true,
      factor: "mobile",
      reason: byMobile.reason,
      message: `Blocked: this mobile number is blacklisted as ${byMobile.entity_code} (${byMobile.name}). Reason: ${byMobile.reason}`,
    };
  }

  const aadhaarIdx = aadhaar ? blindIndex(aadhaar) : "";
  const byAadhaar = aadhaarIdx
    ? hits.find((h) => h.aadhaar_index === aadhaarIdx)
    : undefined;
  if (byAadhaar) {
    return {
      blocked: true,
      factor: "aadhaar",
      reason: byAadhaar.reason,
      message: `Blocked: this Aadhaar number is blacklisted as ${byAadhaar.entity_code} (${byAadhaar.name}). Reason: ${byAadhaar.reason}`,
    };
  }

  const byNameCity = hits[0];
  return {
    blocked: true,
    factor: "name_city",
    reason: byNameCity.reason,
    message: `Held for Managing Director review: name and city match blacklisted record ${byNameCity.entity_code} (${byNameCity.name}). Reason: ${byNameCity.reason}`,
  };
}

export interface BlacklistEntity {
  type: "CUSTOMER" | "MEMBER";
  id: number;
  code: string;
  name: string;
  mobile: string;
  aadhaarLast4?: string | null;
  /** Ciphertext from the entity row; decrypted only to derive the blind index. */
  aadhaarIndex?: string | null;
  city?: string | null;
}

export async function addToBlacklist(
  entity: BlacklistEntity,
  reason: string,
  actor: SessionUser | null,
): Promise<void> {
  const db = await getDb();
  await db.blacklist_registry.create({
    data: {
      entity_type: entity.type,
      entity_id: entity.id,
      entity_code: entity.code,
      name: entity.name,
      name_normalised: normaliseName(entity.name),
      mobile: normaliseMobile(entity.mobile),
      aadhaar_last4: entity.aadhaarLast4 ?? null,
      aadhaar_index: entity.aadhaarIndex ?? null,
      city: entity.city ? normaliseName(entity.city) : null,
      reason,
      blacklisted_by: actor?.id ?? null,
    },
  });
}

export async function removeFromBlacklist(
  type: "CUSTOMER" | "MEMBER",
  id: number,
): Promise<void> {
  const db = await getDb();
  await db.blacklist_registry.deleteMany({
    where: { entity_type: type, entity_id: id },
  });
}
