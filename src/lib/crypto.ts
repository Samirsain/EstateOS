import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

/**
 * All key material is derived from a single APP_SECRET so that a deployment
 * only has to manage one value. Separate labels keep the derived keys
 * independent of one another.
 */
const DEV_SECRET = "cmms-development-secret-change-me-in-production";

interface DerivedKeys {
  encryption: Buffer;
  blindIndex: Buffer;
}

let cachedKeys: DerivedKeys | null = null;

/**
 * Keys are derived on first use rather than at import time: the production
 * guard must fire when the server actually handles a request, not while
 * `next build` is merely loading modules to collect page data.
 */
function keys(): DerivedKeys {
  if (cachedKeys) return cachedKeys;

  const secret = process.env.APP_SECRET;

  if (
    !secret &&
    process.env.NODE_ENV === "production" &&
    process.env.CMMS_ALLOW_DEFAULT_SECRET !== "1"
  ) {
    throw new Error(
      "APP_SECRET must be set in production. Generate one with: openssl rand -hex 32",
    );
  }

  const base = secret ?? DEV_SECRET;
  cachedKeys = {
    encryption: scryptSync(base, "cmms:field-encryption", 32),
    blindIndex: scryptSync(base, "cmms:blind-index", 32),
  };
  return cachedKeys;
}

/**
 * Encrypts a sensitive field (e.g. Aadhaar) with AES-256-GCM.
 * Output layout: v1.<iv>.<authTag>.<ciphertext>, all base64url.
 */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys().encryption, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptField(payload: string): string {
  const [version, iv, authTag, ciphertext] = payload.split(".");
  if (version !== "v1" || !iv || !authTag || !ciphertext) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keys().encryption,
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Deterministic keyed hash used as a blind index. AES-GCM ciphertext differs on
 * every write, so uniqueness constraints and duplicate lookups run against this
 * value instead of the ciphertext.
 */
export function blindIndex(value: string): string {
  return createHmac("sha256", keys().blindIndex)
    .update(value.trim().toLowerCase())
    .digest("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const expectedBuffer = Buffer.from(expected, "base64url");
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), 64);
  if (actual.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actual, expectedBuffer);
}

/** Invite code alphabet with 0/O and 1/I/L removed so codes stay dictatable. */
const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  }
  return code;
}

/** Masks an Aadhaar number for display: XXXX XXXX 1234. */
export function maskAadhaar(aadhaar: string): string {
  const digits = aadhaar.replace(/\D/g, "");
  if (digits.length < 4) return "XXXX XXXX XXXX";
  return `XXXX XXXX ${digits.slice(-4)}`;
}
