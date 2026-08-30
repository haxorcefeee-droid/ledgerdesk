import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { recordTransfer } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney, todayIso } from "@/lib/money";
import { listCashAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function TransfersPage() {
  const tenant = await requireTenant();
  const cash = await listCashAccounts();
  const db = await getDb();
  const moves = await db.all<{
    id: number;
    date: string;
    amount_cents: number;
    memo: string;
    from_name: string;
    to_name: string;
  }>(
    `SELECT m.id, m.date, m.amount_cents, m.memo, a.name AS from_name, b.name AS to_name
     FROM bank_moves m
     JOIN cash_accounts a ON a.id = m.cash_account_id
     LEFT JOIN cash_accounts b ON b.id = m.dest_cash_account_id
     WHERE m.business_id = ? AND m.kind = 'transfer'
     ORDER BY m.date DESC, m.id DESC`,
    tenant.business.id,
  );
  return (
    <AppShell current="transfers">
      <PageHeader title="Inter-account transfers" />
      <form action={recordTransfer} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="From">
          <HuiSelect name="from_id" value={String(cash[0]?.id ?? "")} options={cash.map((c) => ({ value: String(c.id), label: c.name }))} />
        </Field>
        <Field label="To">
          <HuiSelect name="to_id" value={String(cash[1]?.id ?? cash[0]?.id ?? "")} options={cash.map((c) => ({ value: String(c.id), label: c.name }))} />
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Amount">
          <input className={inputClass} name="amount" required placeholder="0.00" />
        </Field>
        <Field label="Memo">
          <input className={inputClass} name="memo" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Transfer</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Date", "From", "To", "Amount", "Memo"]}>
        {moves.map((move) => (
          <tr key={move.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{move.date}</td>
            <td className="px-4 py-3">{move.from_name}</td>
            <td className="px-4 py-3">{move.to_name}</td>
            <td className="px-4 py-3 sans">{formatMoney(move.amount_cents, tenant.business.currency)}</td>
            <td className="px-4 py-3">{move.memo}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
