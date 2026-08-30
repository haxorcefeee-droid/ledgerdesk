import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { createCashAccount, recordCashMove } from "@/lib/actions";
import { accountBalanceCents } from "@/lib/ledger";
import { formatMoney, todayIso } from "@/lib/money";
import { getBusiness, listAccounts, listCashAccounts } from "@/lib/queries";

export default async function CashPage() {
  const business = await getBusiness();
  const cashAccounts = await listCashAccounts();
  const accounts = await listAccounts();
  const offsets = accounts.filter((a) => a.type !== "asset" || !cashAccounts.some((c) => c.account_id === a.id));
  const balances = await Promise.all(cashAccounts.map((account) => accountBalanceCents(account.account_id)));

  return (
    <AppShell current="cash">
      <PageHeader title="Cash" />
      <DataTable headers={["Name", "GL account", "Balance"]}>
        {cashAccounts.map((account, index) => (
          <tr key={account.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{account.name}</td>
            <td className="px-4 py-3 sans">
              {account.code} {account.account_name}
            </td>
            <td className="px-4 py-3 sans">
              {formatMoney(balances[index], business.currency)}
            </td>
          </tr>
        ))}
      </DataTable>

      <h3 className="mt-10 mb-3 text-xl">Receipt or payment</h3>
      <form action={recordCashMove} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Kind">
          <select className={inputClass} name="kind" defaultValue="receipt">
            <option value="receipt">Receipt (money in)</option>
            <option value="payment">Payment (money out)</option>
          </select>
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Cash account">
          <select className={inputClass} name="cash_account_id">
            {cashAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Offset account">
          <select className={inputClass} name="offset_account_id">
            {offsets.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} {account.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount">
          <input className={inputClass} name="amount" placeholder="0.00" required />
        </Field>
        <Field label="Memo">
          <input className={inputClass} name="memo" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Post to journal</PrimaryButton>
        </div>
      </form>

      <h3 className="mb-3 text-xl">Add cash account</h3>
      <form action={createCashAccount} className="grid max-w-xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} name="name" required placeholder="Petty cash" />
        </Field>
        <Field label="New GL code">
          <input className={inputClass} name="code" required placeholder="1010" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Create cash account</PrimaryButton>
        </div>
      </form>
    </AppShell>
  );
}
