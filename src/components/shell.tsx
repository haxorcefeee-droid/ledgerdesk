import Link from "next/link";
import { getBusiness } from "@/lib/queries";

const NAV = [
  { href: "/", label: "Overview", key: "home" },
  { href: "/accounts", label: "Chart of accounts", key: "accounts" },
  { href: "/journals", label: "Journal", key: "journals" },
  { href: "/cash", label: "Cash", key: "cash" },
  { href: "/customers", label: "Customers", key: "customers" },
  { href: "/invoices", label: "Sales invoices", key: "invoices" },
  { href: "/reports", label: "Reports", key: "reports" },
  { href: "/settings", label: "Business", key: "settings" },
];

export function AppShell({
  children,
  current,
}: {
  children: React.ReactNode;
  current: string;
}) {
  const business = getBusiness();
  const visible = NAV.filter((item) => {
    if (item.key === "cash") return business.modules.cash;
    if (item.key === "customers") return business.modules.customers;
    if (item.key === "invoices") return business.modules.invoices;
    if (item.key === "reports") return business.modules.reports;
    return true;
  });

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--line)] bg-[var(--panel)] px-5 py-6 md:min-h-screen md:border-b-0 md:border-r">
        <p className="text-xs tracking-[0.2em] text-[var(--muted)] uppercase sans">LedgerDesk</p>
        <h1 className="mt-2 text-2xl leading-tight">{business.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)] sans">{business.currency}</p>
        <nav className="mt-8 flex flex-col gap-1 sans text-sm">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 ${
                current === item.key ? "bg-teal-800 text-[var(--accent-ink)]" : "hover:bg-stone-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
