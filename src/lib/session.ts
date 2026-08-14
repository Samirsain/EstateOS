import { SignJWT, jwtVerify } from "jose";
import type { Role, SessionUser } from "./types";

const SESSION_COOKIE = "cmms_session";
/** Sessions expire after 8 hours — one office shift (PRD §9, session management). */
const SESSION_TTL_SECONDS = 8 * 60 * 60;

const DEV_SECRET = "cmms-development-secret-change-me-in-production";

let cachedKey: Uint8Array | null = null;

/**
 * Derived on first use, not at import time, so the production guard fires when
 * a request is actually handled rather than while `next build` collects page
 * data. Falling back to the public dev string in production would make every
 * session token forgeable, so that case throws instead.
 */
function secretKey(): Uint8Array {
  if (cachedKey) return cachedKey;

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

  cachedKey = new TextEncoder().encode(secret ?? DEV_SECRET);
  return cachedKey;
}

export const sessionCookieName = SESSION_COOKIE;
export const sessionMaxAge = SESSION_TTL_SECONDS;

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    sub: String(user.id),
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Verifies a session token. Runs on the Edge runtime (middleware) as well as
 * the Node runtime, so it deliberately avoids `node:crypto` and the database.
 */
export async function verifySession(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  /* Derived outside the try: a missing APP_SECRET is a misconfiguration and
     must surface, not be swallowed into a silent "not signed in". */
  const key = secretKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    const role = payload.role as Role;
    if (role !== "MD" && role !== "PC") return null;
    return {
      id: Number(payload.sub),
      username: String(payload.username),
      name: String(payload.name),
      role,
    };
  } catch {
    return null;
  }
}
