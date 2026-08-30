import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { addStatementLine, applyBankRules, matchStatement } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney, todayIso } from "@/lib/money";
import { listCashAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function ReconcilePage() {
  const tenant = await requireTenant();
  const cash = await listCashAccounts();
  const db = await getDb();
  const lines = await db.all<{
    id: number;
    date: string;
    amount_cents: number;
    description: string;
    matched_move_id: number | null;
    cash_name: string;
  }>(
    `SELECT s.id, s.date, s.amount_cents, s.description, s.matched_move_id, c.name AS cash_name
     FROM bank_statement_lines s JOIN cash_accounts c ON c.id = s.cash_account_id
     WHERE s.business_id = ?
     ORDER BY s.date DESC, s.id DESC`,
    tenant.business.id,
  );
  const moves = await db.all<{ id: number; date: string; amount_cents: number; memo: string }>(
    "SELECT id, date, amount_cents, memo FROM bank_moves WHERE business_id = ? ORDER BY date DESC",
    tenant.business.id,
  );
  return (
    <AppShell current="reconcile">
      <PageHeader title="Bank reconciliation" />
      <form action={addStatementLine} className="mb-6 grid max-w-3xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-4">
        <Field label="Account">
          <HuiSelect name="cash_account_id" value={String(cash[0]?.id ?? "")} options={cash.map((c) => ({ value: String(c.id), label: c.name }))} />
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Amount">
          <input className={inputClass} name="amount" required />
        </Field>
        <Field label="Description">
          <input className={inputClass} name="description" required />
        </Field>
        <div className="md:col-span-4">
          <PrimaryButton>Add statement line</PrimaryButton>
        </div>
      </form>
      <form action={applyBankRules} className="mb-6">
        <PrimaryButton>Apply bank rules</PrimaryButton>
      </form>
      <DataTable headers={["Account", "Date", "Description", "Amount", "Match"]}>
        {lines.map((line) => (
          <tr key={line.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{line.cash_name}</td>
            <td className="px-4 py-3 sans">{line.date}</td>
            <td className="px-4 py-3">{line.description}</td>
            <td className="px-4 py-3 sans">{formatMoney(line.amount_cents, tenant.business.currency)}</td>
            <td className="px-4 py-3">
              {line.matched_move_id ? (
                <span className="text-[var(--muted)]">Matched #{line.matched_move_id}</span>
              ) : (
                <form action={matchStatement} className="flex gap-2">
                  <input type="hidden" name="line_id" value={line.id} />
                  <select className={inputClass} name="move_id">
                    {moves.map((move) => (
                      <option key={move.id} value={move.id}>
                        {move.date} {move.memo} {formatMoney(move.amount_cents, tenant.business.currency)}
                      </option>
                    ))}
                  </select>
                  <button className="sans text-sm text-teal-800 underline">Match</button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
