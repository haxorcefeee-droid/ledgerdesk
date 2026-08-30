export const SESSION_COOKIE = "ledgerdesk_session";
const SESSION_DAYS = 14;

function authSecret(): string {
  return process.env.AUTH_SECRET || process.env.LEDGERDESK_PASSWORD || "ledgerdesk-dev-only";
}

export function isAuthEnabled(): boolean {
  return Boolean(process.env.LEDGERDESK_PASSWORD);
}

export function configuredPassword(): string | undefined {
  return process.env.LEDGERDESK_PASSWORD || undefined;
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
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function passwordsMatch(input: string, expected: string): Promise<boolean> {
  const a = await hmac(`pw:${input}`);
  const b = await hmac(`pw:${expected}`);
  return timingSafeEqual(a, b);
}

export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `v1.${exp}`;
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const signature = await hmac(payload);
  return timingSafeEqual(signature, parts[2]);
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
