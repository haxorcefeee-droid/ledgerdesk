import { AppShell } from "@/components/shell";
import { Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { postOpeningBalances } from "@/lib/extra-actions";
import { accountBalanceCents } from "@/lib/ledger";
import { formatMoney, todayIso } from "@/lib/money";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function OpeningBalancesPage() {
  const tenant = await requireTenant();
  const accounts = await listAccounts();
  const balances = await Promise.all(accounts.map((account) => accountBalanceCents(account.id)));
  return (
    <AppShell current="accounts">
      <PageHeader title="Starting balances" />
      <p className="mb-6 max-w-2xl text-[var(--muted)]">
        Enter signed amounts when migrating from another system. The difference posts to owner equity (3000).
      </p>
      <form action={postOpeningBalances} className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Opening date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sans text-[var(--muted)]">
              <tr>
                <th className="py-2 text-left">Account</th>
                <th className="py-2 text-left">Current</th>
                <th className="py-2 text-left">Opening amount</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account, index) => (
                <tr key={account.id}>
                  <td className="py-2">
                    {account.code} {account.name}
                    <input type="hidden" name="account_id" value={account.id} />
                    <input type="hidden" name="type" value={account.type} />
                  </td>
                  <td className="py-2 sans">{formatMoney(balances[index], tenant.business.currency)}</td>
                  <td className="py-2">
                    <input className={inputClass} name="amount" placeholder="0.00" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PrimaryButton>Post opening balances</PrimaryButton>
      </form>
    </AppShell>
  );
}
