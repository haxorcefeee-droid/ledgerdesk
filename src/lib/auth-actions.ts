"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  configuredPassword,
  createSessionToken,
  passwordsMatch,
  sessionCookieOptions,
} from "./auth";

function formString(form: FormData, key: string): string {
  return String(form.get(key) ?? "");
}

export async function login(form: FormData) {
  const password = formString(form, "password");
  const next = formString(form, "next") || "/";
  const expected = configuredPassword();
  if (!expected) {
    redirect("/login?error=setup");
  }
  if (!(await passwordsMatch(password, expected))) {
    const dest = next && next.startsWith("/") ? `/login?error=1&next=${encodeURIComponent(next)}` : "/login?error=1";
    redirect(dest);
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions());
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
