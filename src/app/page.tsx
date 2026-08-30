import Link from "next/link";
import { AppShell } from "@/components/shell";
import { DataTable, PageHeader } from "@/components/ui";
import { accountBalanceCents, systemAccountId } from "@/lib/ledger";
import { formatMoney, todayIso } from "@/lib/money";
import { getBusiness, listAccounts, listCashAccounts, listInvoices } from "@/lib/queries";
import { profitAndLoss } from "@/lib/reports";
import { requireTenant } from "@/lib/tenant";

export default async function HomePage() {
  const tenant = await requireTenant();
  const business = await getBusiness();
  const accounts = (await listAccounts()).slice(0, 8);
  const cashAccounts = await listCashAccounts();
  const openInvoices = (await listInvoices()).filter((i) => i.status === "posted" && i.total_cents > i.paid_cents);
  const balances = await Promise.all(accounts.map((account) => accountBalanceCents(account.id)));
  const cashBalances = await Promise.all(cashAccounts.map((account) => accountBalanceCents(account.account_id)));
  const cashTotal = cashBalances.reduce((sum, value) => sum + value, 0);
  let ar = 0;
  let ap = 0;
  try {
    ar = await accountBalanceCents(await systemAccountId(business.id, "accounts_receivable"));
    ap = await accountBalanceCents(await systemAccountId(business.id, "accounts_payable"));
  } catch {
    ar = 0;
    ap = 0;
  }
  const year = todayIso().slice(0, 4);
  const pnl = await profitAndLoss(`${year}-01-01`, todayIso());

  return (
    <AppShell current="home">
      <PageHeader title="Overview" />
      {tenant.business.lock_date ? (
        <p className="mb-4 rounded-md border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm">
          Periods on or before <span className="sans">{tenant.business.lock_date}</span> are locked.
        </p>
      ) : null}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="sans text-sm text-[var(--muted)]">Cash</p>
          <p className="mt-2 text-2xl">{formatMoney(cashTotal, business.currency)}</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="sans text-sm text-[var(--muted)]">Receivables</p>
          <p className="mt-2 text-2xl">{formatMoney(ar, business.currency)}</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="sans text-sm text-[var(--muted)]">Payables</p>
          <p className="mt-2 text-2xl">{formatMoney(ap, business.currency)}</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="sans text-sm text-[var(--muted)]">YTD net income</p>
          <p className="mt-2 text-2xl">{formatMoney(pnl.netCents, business.currency)}</p>
        </div>
      </div>
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
        {accounts.map((account, index) => (
          <tr key={account.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{account.code}</td>
            <td className="px-4 py-3">{account.name}</td>
            <td className="px-4 py-3 capitalize">{account.type}</td>
            <td className="px-4 py-3 sans">{formatMoney(balances[index], business.currency)}</td>
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
