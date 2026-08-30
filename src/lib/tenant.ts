import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { getDb } from "./db";
import { asCount } from "./sql-count";
import { DEFAULT_MODULES, type ModuleKey, type Role } from "./modules";
import { asPlain, asPlainList } from "./plain";

export type CurrentUser = {
  id: number;
  email: string;
  name: string;
};

export type CurrentBusiness = {
  id: number;
  name: string;
  currency: string;
  fiscal_year_start: string;
  lock_date: string | null;
  locale: string;
  date_format: string;
  number_format: string;
  direction: string;
  theme: string;
  invoice_theme: string;
  footer_text: string;
  modules: Record<ModuleKey, boolean>;
};

export type Tenant = {
  user: CurrentUser;
  business: CurrentBusiness;
  role: Role;
  businesses: Array<{ id: number; name: string; role: Role }>;
};

export async function userCount(): Promise<number> {
  const db = await getDb();
  const row = await db.get<{ n: unknown }>("SELECT COUNT(*) AS n FROM users");
  return asCount(row);
}

export async function optionalTenant(): Promise<Tenant | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const db = await getDb();
  const user = await db.get<CurrentUser>("SELECT id, email, name FROM users WHERE id = ?", session.userId);
  if (!user) return null;
  const memberships = await db.all<{ id: number; name: string; role: Role }>(
    `SELECT b.id, b.name, m.role
     FROM memberships m JOIN businesses b ON b.id = m.business_id
     WHERE m.user_id = ? ORDER BY b.name`,
    user.id,
  );
  if (memberships.length === 0) return null;
  const preferred =
    memberships.find((item) => item.id === session.businessId) ?? memberships[0];
  const row = await db.get<{
    id: number;
    name: string;
    currency: string;
    fiscal_year_start: string;
    lock_date: string | null;
    locale: string;
    date_format: string;
    number_format: string;
    direction: string;
    theme: string;
    invoice_theme: string;
    footer_text: string;
    modules_json: string;
  }>("SELECT * FROM businesses WHERE id = ?", preferred.id);
  if (!row) return null;
  let modules = { ...DEFAULT_MODULES };
  try {
    modules = { ...DEFAULT_MODULES, ...JSON.parse(row.modules_json) };
  } catch {
    modules = { ...DEFAULT_MODULES };
  }
  return {
    user: asPlain(user),
    business: asPlain({ ...row, modules }),
    role: preferred.role,
    businesses: asPlainList(memberships),
  };
}

export async function requireTenant(): Promise<Tenant> {
  const tenant = await optionalTenant();
  if (!tenant) {
    const count = await userCount();
    redirect(count === 0 ? "/setup" : "/login");
  }
  return tenant;
}

export function assertUnlocked(business: CurrentBusiness, date: string) {
  if (business.lock_date && date <= business.lock_date) {
    throw new Error(`Period is locked on or before ${business.lock_date}.`);
  }
}
