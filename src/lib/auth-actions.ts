"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "./auth";
import { getDb, seedBusinessBooks } from "./db";
import { asCount } from "./sql-count";
import { DEFAULT_MODULES } from "./modules";
import { hashPassword, verifyPassword } from "./passwords";

function formString(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

async function setSession(userId: number, businessId: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(userId, businessId), sessionCookieOptions());
}

export async function setupAccount(form: FormData) {
  const db = await getDb();
  const existing = await db.get<{ n: unknown }>("SELECT COUNT(*) AS n FROM users");
  if (asCount(existing) > 0) redirect("/login");
  const name = formString(form, "name");
  const email = formString(form, "email").toLowerCase();
  const password = formString(form, "password");
  const businessName = formString(form, "business_name");
  if (!name || !email || !password || !businessName) throw new Error("All fields are required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  const userId = await db.transaction(async (tx) => {
    const user = await tx.run(
      "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
      email,
      name,
      await hashPassword(password),
    );
    const uid = Number(user.lastInsertRowid);
    const existingBiz = await tx.get<{ id: number }>("SELECT id FROM businesses ORDER BY id LIMIT 1");
    let bid: number;
    if (existingBiz) {
      bid = existingBiz.id;
      await tx.run(
        "UPDATE businesses SET name = ?, modules_json = ? WHERE id = ?",
        businessName,
        JSON.stringify(DEFAULT_MODULES),
        bid,
      );
    } else {
      const biz = await tx.run(
        "INSERT INTO businesses (name, currency, fiscal_year_start, modules_json) VALUES (?, 'USD', '01-01', ?)",
        businessName,
        JSON.stringify(DEFAULT_MODULES),
      );
      bid = Number(biz.lastInsertRowid);
    }
    await tx.run("INSERT INTO memberships (user_id, business_id, role) VALUES (?, ?, 'owner')", uid, bid);
    await seedBusinessBooks(tx, bid);
    const loc = await tx.get<{ id: number }>("SELECT id FROM locations WHERE business_id = ?", bid);
    if (!loc) await tx.run("INSERT INTO locations (business_id, name) VALUES (?, ?)", bid, "Main warehouse");
    const div = await tx.get<{ id: number }>("SELECT id FROM divisions WHERE business_id = ?", bid);
    if (!div) await tx.run("INSERT INTO divisions (business_id, name, code) VALUES (?, ?, ?)", bid, "General", "GEN");
    return uid;
  });
  const membership = await db.get<{ business_id: number }>(
    "SELECT business_id FROM memberships WHERE user_id = ?",
    userId,
  );
  await setSession(userId, membership?.business_id ?? 1);
  redirect("/");
}

export async function login(form: FormData) {
  const email = formString(form, "email").toLowerCase();
  const password = formString(form, "password");
  const next = formString(form, "next") || "/";
  const db = await getDb();
  const user = await db.get<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = ?",
    email,
  );
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    redirect("/login?error=1");
  }
  const membership = await db.get<{ business_id: number }>(
    "SELECT business_id FROM memberships WHERE user_id = ? ORDER BY id",
    user.id,
  );
  await setSession(user.id, membership?.business_id ?? 0);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function switchBusiness(form: FormData) {
  const businessId = Number(formString(form, "business_id"));
  const jar = await cookies();
  const { verifySessionToken } = await import("./auth");
  const session = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  const db = await getDb();
  const membership = await db.get<{ id: number }>(
    "SELECT id FROM memberships WHERE user_id = ? AND business_id = ?",
    session.userId,
    businessId,
  );
  if (!membership) throw new Error("You do not belong to that business.");
  await setSession(session.userId, businessId);
  redirect("/");
}

export async function createBusiness(form: FormData) {
  const name = formString(form, "name");
  if (!name) throw new Error("Business name is required.");
  const jar = await cookies();
  const { verifySessionToken } = await import("./auth");
  const session = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  const db = await getDb();
  const created = await db.run(
    "INSERT INTO businesses (name, currency, fiscal_year_start, modules_json) VALUES (?, ?, '01-01', ?)",
    name,
    formString(form, "currency") || "USD",
    JSON.stringify(DEFAULT_MODULES),
  );
  const businessId = Number(created.lastInsertRowid);
  await db.run("INSERT INTO memberships (user_id, business_id, role) VALUES (?, ?, 'owner')", session.userId, businessId);
  await seedBusinessBooks(db, businessId);
  await db.run("INSERT INTO locations (business_id, name) VALUES (?, ?)", businessId, "Main warehouse");
  await setSession(session.userId, businessId);
  redirect("/");
}
