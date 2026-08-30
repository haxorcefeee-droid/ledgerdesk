import Link from "next/link";
import { logout } from "@/lib/auth-actions";
import { requireTenant } from "@/lib/tenant";
import { BusinessSwitcher } from "./business-switcher";
import { HuiMenu } from "./hui";
import { SearchForm } from "./search-form";

const GROUPS = [
  {
    label: "Ledger",
    items: [
      { href: "/", label: "Overview", key: "home" },
      { href: "/accounts", label: "Chart of accounts", key: "accounts" },
      { href: "/journals", label: "Journal", key: "journals" },
    ],
  },
  {
    label: "Cash",
    module: "cash",
    items: [
      { href: "/cash", label: "Accounts", key: "cash" },
      { href: "/cash/transfers", label: "Transfers", key: "transfers" },
      { href: "/cash/reconcile", label: "Reconciliation", key: "reconcile" },
      { href: "/cash/rules", label: "Bank rules", key: "rules" },
      { href: "/cash/claims", label: "Expense claims", key: "claims" },
    ],
  },
  {
    label: "Sales",
    module: "sales",
    items: [
      { href: "/sales/customers", label: "Customers", key: "customers" },
      { href: "/sales/quotes", label: "Quotes", key: "quotes" },
      { href: "/sales/orders", label: "Orders", key: "orders" },
      { href: "/invoices", label: "Invoices", key: "invoices" },
      { href: "/sales/credits", label: "Credit notes", key: "credits" },
      { href: "/sales/delivery", label: "Delivery notes", key: "delivery" },
      { href: "/sales/time", label: "Billable time", key: "time" },
      { href: "/sales/expenses", label: "Billable expenses", key: "billable" },
      { href: "/sales/withholding", label: "Withholding", key: "withholding" },
    ],
  },
  {
    label: "Purchases",
    module: "purchases",
    items: [
      { href: "/purchases/suppliers", label: "Suppliers", key: "suppliers" },
      { href: "/purchases/quotes", label: "Quotes", key: "pquotes" },
      { href: "/purchases/orders", label: "Orders", key: "porders" },
      { href: "/purchases/bills", label: "Bills", key: "bills" },
      { href: "/purchases/debits", label: "Debit notes", key: "debits" },
      { href: "/purchases/receipts", label: "Goods receipts", key: "greceipts" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/projects", label: "Projects", key: "projects", module: "projects" },
      { href: "/inventory/items", label: "Items", key: "inventory", module: "inventory" },
      { href: "/inventory/locations", label: "Locations", key: "locations", module: "inventory" },
      { href: "/inventory/transfers", label: "Transfers", key: "invtransfers", module: "inventory" },
      { href: "/inventory/writeoffs", label: "Write-offs", key: "writeoffs", module: "inventory" },
      { href: "/inventory/production", label: "Production", key: "production", module: "inventory" },
      { href: "/payroll/employees", label: "Employees", key: "payroll", module: "payroll" },
      { href: "/payroll/payslips", label: "Payslips", key: "payslips", module: "payroll" },
      { href: "/payroll/items", label: "Payslip items", key: "payitems", module: "payroll" },
      { href: "/assets", label: "Fixed assets", key: "assets", module: "assets" },
      { href: "/assets/intangibles", label: "Intangibles", key: "intangibles", module: "assets" },
      { href: "/assets/investments", label: "Investments", key: "investments", module: "assets" },
      { href: "/equity", label: "Equity", key: "equity", module: "equity" },
    ],
  },
  {
    label: "Company",
    items: [
      { href: "/reports", label: "Reports", key: "reports", module: "reports" },
      { href: "/settings", label: "Settings", key: "settings" },
    ],
  },
];

export async function AppShell({
  children,
  current,
}: {
  children: React.ReactNode;
  current: string;
}) {
  const tenant = await requireTenant();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]" data-theme={tenant.business.theme}>
      <aside className="no-print border-b border-[var(--line)] bg-[var(--panel)] px-4 py-5 md:min-h-screen md:border-b-0 md:border-r">
        <p className="text-xs tracking-[0.2em] text-[var(--muted)] uppercase sans">LedgerDesk</p>
        <div className="mt-3">
          <BusinessSwitcher currentId={tenant.business.id} businesses={tenant.businesses} />
        </div>
        <p className="mt-2 text-sm text-[var(--muted)] sans">
          {tenant.business.currency} · {tenant.role}
        </p>
        <div className="mt-4">
          <SearchForm placeholder="Search" href="/search" />
        </div>
        <nav className="mt-6 flex flex-col gap-4">
          {GROUPS.map((group) => {
            const items = group.items.filter((item) => {
              const moduleKey = item.module ?? group.module;
              if (!moduleKey) return true;
              return tenant.business.modules[moduleKey as keyof typeof tenant.business.modules] !== false;
            });
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="mb-1 px-2 sans text-[11px] tracking-wider text-[var(--muted)] uppercase">{group.label}</p>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-md px-3 py-1.5 sans text-sm ${
                        current === item.key ? "bg-teal-800 text-[var(--accent-ink)]" : "hover:bg-stone-100 dark:hover:bg-stone-800"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="mt-8 flex items-center justify-between px-2">
          <span className="sans text-xs text-[var(--muted)]">{tenant.user.name}</span>
          <form action={logout}>
            <button type="submit" className="sans text-xs text-teal-800 underline">
              Sign out
            </button>
          </form>
        </div>
        <div className="mt-3 px-2">
          <HuiMenu
            label="New"
            items={[
              { href: "/journals/new", label: "Journal" },
              { href: "/invoices/new", label: "Sales invoice" },
              { href: "/documents/new?kind=bill", label: "Purchase bill" },
              { href: "/businesses/new", label: "Business" },
            ]}
          />
        </div>
      </aside>
      <main className="px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
