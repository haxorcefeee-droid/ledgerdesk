export const MODULES = [
  { key: "cash", label: "Cash & bank" },
  { key: "sales", label: "Sales" },
  { key: "purchases", label: "Purchases" },
  { key: "projects", label: "Projects" },
  { key: "inventory", label: "Inventory" },
  { key: "payroll", label: "Payroll" },
  { key: "assets", label: "Fixed assets" },
  { key: "equity", label: "Equity" },
  { key: "reports", label: "Reports" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export const DEFAULT_MODULES: Record<ModuleKey, boolean> = {
  cash: true,
  sales: true,
  purchases: true,
  projects: true,
  inventory: true,
  payroll: true,
  assets: true,
  equity: true,
  reports: true,
};

export const ROLES = ["owner", "admin", "accountant", "sales", "purchases", "readonly"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Administrator",
  accountant: "Accountant",
  sales: "Sales",
  purchases: "Purchases",
  readonly: "View only",
};

export function canWrite(role: Role, area: string): boolean {
  if (role === "readonly") return false;
  if (role === "owner" || role === "admin" || role === "accountant") return true;
  if (role === "sales") return ["sales", "customers", "projects", "home"].includes(area);
  if (role === "purchases") return ["purchases", "suppliers", "projects", "home"].includes(area);
  return false;
}

export function canManageUsers(role: Role): boolean {
  return role === "owner" || role === "admin";
}

export function canManageSettings(role: Role): boolean {
  return role === "owner" || role === "admin";
}
