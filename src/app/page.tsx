import Link from "next/link";
import { AppShell } from "@/components/shell";
import { DataTable, PageHeader } from "@/components/ui";
import { accountBalanceCents } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { getBusiness, listAccounts, listInvoices } from "@/lib/queries";

export default function HomePage() {
  const business = getBusiness();
  const accounts = listAccounts().slice(0, 8);
  const openInvoices = listInvoices().filter((i) => i.status === "posted" && i.total_cents > i.paid_cents);

  return (
    <AppShell current="home">
      <PageHeader title="Overview" />
      <p className="mb-8 max-w-2xl text-[var(--muted)]">
        Every cash movement and invoice posts into the same journal. Reports read that journal — there is no second set of books.
      </p>
      <div className="mb-10 grid gap-4 md:grid-cols-3">
        <Link href="/journals/new" className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 hover:border-teal-700">
          <p className="sans text-sm text-[var(--muted)]">Record</p>
          <p className="mt-1 text-xl">Journal entry</p>
        </Link>
        {business.modules.invoices && (
          <Link href="/invoices/new" className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 hover:border-teal-700">
            <p className="sans text-sm text-[var(--muted)]">Bill</p>
            <p className="mt-1 text-xl">Sales invoice</p>
          </Link>
        )}
        {business.modules.reports && (
          <Link href="/reports" className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 hover:border-teal-700">
            <p className="sans text-sm text-[var(--muted)]">Read</p>
            <p className="mt-1 text-xl">Financial reports</p>
          </Link>
        )}
      </div>
      <h3 className="mb-3 text-xl">Account balances</h3>
      <DataTable headers={["Code", "Account", "Type", "Balance"]}>
        {accounts.map((account) => (
          <tr key={account.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{account.code}</td>
            <td className="px-4 py-3">{account.name}</td>
            <td className="px-4 py-3 capitalize">{account.type}</td>
            <td className="px-4 py-3 sans">{formatMoney(accountBalanceCents(account.id), business.currency)}</td>
          </tr>
        ))}
      </DataTable>
      {business.modules.invoices && (
        <>
          <h3 className="mt-10 mb-3 text-xl">Open invoices</h3>
          {openInvoices.length === 0 ? (
            <p className="text-[var(--muted)]">No unpaid posted invoices.</p>
          ) : (
            <DataTable headers={["Number", "Customer", "Balance"]}>
              {openInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <Link className="text-teal-800 underline" href={`/invoices/${invoice.id}`}>
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{invoice.customer_name}</td>
                  <td className="px-4 py-3 sans">
                    {formatMoney(invoice.total_cents - invoice.paid_cents, business.currency)}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </>
      )}
    </AppShell>
  );
}
