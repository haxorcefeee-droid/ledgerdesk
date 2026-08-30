import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createClaim } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney, todayIso } from "@/lib/money";
import { listAccounts, listCashAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function ClaimsPage() {
  const tenant = await requireTenant();
  const accounts = (await listAccounts()).filter((a) => a.type === "expense");
  const cash = await listCashAccounts();
  const db = await getDb();
  const claims = await db.all<{
    id: number;
    payer_name: string;
    date: string;
    amount_cents: number;
    memo: string;
    status: string;
  }>("SELECT * FROM expense_claims WHERE business_id = ? ORDER BY date DESC", tenant.business.id);
  return (
    <AppShell current="claims">
      <PageHeader title="Expense claims" />
      <form action={createClaim} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Payer">
          <input className={inputClass} name="payer_name" required placeholder="Employee name" />
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Expense account">
          <HuiSelect name="account_id" value={String(accounts[0]?.id ?? "")} options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))} />
        </Field>
        <Field label="Paid from">
          <HuiSelect name="cash_account_id" value={String(cash[0]?.id ?? "")} options={cash.map((c) => ({ value: String(c.id), label: c.name }))} />
        </Field>
        <Field label="Amount">
          <input className={inputClass} name="amount" required />
        </Field>
        <Field label="Memo">
          <input className={inputClass} name="memo" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Reimburse and post</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Payer", "Date", "Amount", "Status", "Memo"]}>
        {claims.map((claim) => (
          <tr key={claim.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{claim.payer_name}</td>
            <td className="px-4 py-3 sans">{claim.date}</td>
            <td className="px-4 py-3 sans">{formatMoney(claim.amount_cents, tenant.business.currency)}</td>
            <td className="px-4 py-3">{claim.status}</td>
            <td className="px-4 py-3">{claim.memo}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
