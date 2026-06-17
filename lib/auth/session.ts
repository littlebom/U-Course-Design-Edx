import { SignJWT, jwtVerify } from "jose";

// Edge-safe session helpers (jose only — no node:crypto, no next/headers) so
// this module can be imported from middleware. Server-only cookie reading lives
// in lib/auth/server.ts.

export const SESSION_COOKIE = "ucb_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  uid: string;
  username: string;
  name: string;
  role: string;
}

function secretKey(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function createSessionToken(p: SessionPayload): Promise<string> {
  return new SignJWT({ username: p.username, name: p.name, role: p.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.uid)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      uid: payload.sub,
      username: String(payload.username ?? ""),
      name: String(payload.name ?? ""),
      role: String(payload.role ?? "user"),
    };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE_SEC;
