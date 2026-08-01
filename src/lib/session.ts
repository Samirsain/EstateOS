import { SignJWT, jwtVerify } from "jose";
import type { Role, SessionUser } from "./types";

const SESSION_COOKIE = "cmms_session";
/** Sessions expire after 8 hours — one office shift (PRD §9, session management). */
const SESSION_TTL_SECONDS = 8 * 60 * 60;

const secretKey = new TextEncoder().encode(
  process.env.APP_SECRET ??
    "cmms-development-secret-change-me-in-production",
);

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
    .sign(secretKey);
}

/**
 * Verifies a session token. Runs on the Edge runtime (middleware) as well as
 * the Node runtime, so it deliberately avoids `node:crypto` and the database.
 */
export async function verifySession(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, {
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
