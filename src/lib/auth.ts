export const SESSION_COOKIE = "ledgerdesk_session";
const SESSION_DAYS = 14;

function authSecret(): string {
  return process.env.AUTH_SECRET || process.env.LEDGERDESK_PASSWORD || "ledgerdesk-dev-only";
}

function hex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...view].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return hex(signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type SessionPayload = { userId: number; businessId: number; exp: number };

export async function createSessionToken(userId: number, businessId: number): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `v2.${userId}.${businessId}.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v2") return null;
  const userId = Number(parts[1]);
  const businessId = Number(parts[2]);
  const exp = Number(parts[3]);
  if (!Number.isFinite(userId) || !Number.isFinite(businessId) || !Number.isFinite(exp) || exp < Date.now()) {
    return null;
  }
  const payload = `${parts[0]}.${parts[1]}.${parts[2]}.${parts[3]}`;
  if (!timingSafeEqual(await hmac(payload), parts[4])) return null;
  return { userId, businessId, exp };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.VERCEL === "1" || process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
