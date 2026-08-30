import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { formatMoney, todayIso } from "@/lib/money";
import { getBusiness } from "@/lib/queries";
import { balanceSheet, profitAndLoss, trialBalance } from "@/lib/reports";

function yearStart(asOf: string, md: string): string {
  const year = Number(asOf.slice(0, 4));
  const [mm, dd] = md.split("-");
  const candidate = `${year}-${mm}-${dd}`;
  return asOf >= candidate ? candidate : `${year - 1}-${mm}-${dd}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const business = getBusiness();
  const asOf = params.asOf || todayIso();
  const from = params.from || yearStart(asOf, business.fiscal_year_start);
  const to = params.to || asOf;
  const trial = trialBalance(asOf);
  const pnl = profitAndLoss(from, to);
  const sheet = balanceSheet(asOf);
  const trialDebit = trial.reduce((s, r) => s + r.debitCents, 0);
  const trialCredit = trial.reduce((s, r) => s + r.creditCents, 0);

  return (
    <AppShell current="reports">
      <PageHeader title="Reports" />
      <form className="mb-8 flex flex-wrap items-end gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4">
        <Field label="As of">
          <input className={inputClass} type="date" name="asOf" defaultValue={asOf} />
        </Field>
        <Field label="P&L from">
          <input className={inputClass} type="date" name="from" defaultValue={from} />
        </Field>
        <Field label="P&L to">
          <input className={inputClass} type="date" name="to" defaultValue={to} />
        </Field>
        <PrimaryButton>Refresh</PrimaryButton>
      </form>

      <h3 className="mb-3 text-xl">Trial balance</h3>
      <DataTable headers={["Code", "Account", "Debit", "Credit"]}>
        {trial.map((row) => (
          <tr key={row.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-2 sans">{row.code}</td>
            <td className="px-4 py-2">{row.name}</td>
            <td className="px-4 py-2 sans">{row.debitCents ? formatMoney(row.debitCents, business.currency) : ""}</td>
            <td className="px-4 py-2 sans">{row.creditCents ? formatMoney(row.creditCents, business.currency) : ""}</td>
          </tr>
        ))}
        <tr className="border-t border-[var(--line)] font-medium">
          <td className="px-4 py-3" colSpan={2}>
            Totals
          </td>
          <td className="px-4 py-3 sans">{formatMoney(trialDebit, business.currency)}</td>
          <td className="px-4 py-3 sans">{formatMoney(trialCredit, business.currency)}</td>
        </tr>
      </DataTable>

      <h3 className="mt-10 mb-3 text-xl">Profit and loss</h3>
      <DataTable headers={["Account", "Type", "Amount"]}>
        {pnl.rows.map((row) => (
          <tr key={row.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-2">
              {row.code} {row.name}
            </td>
            <td className="px-4 py-2 capitalize">{row.type}</td>
            <td className="px-4 py-2 sans">{formatMoney(row.balanceCents, business.currency)}</td>
          </tr>
        ))}
        <tr className="border-t border-[var(--line)] font-medium">
          <td className="px-4 py-3" colSpan={2}>
            Net income
          </td>
          <td className="px-4 py-3 sans">{formatMoney(pnl.netCents, business.currency)}</td>
        </tr>
      </DataTable>

      <h3 className="mt-10 mb-3 text-xl">Balance sheet</h3>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 sans text-sm text-[var(--muted)]">Assets</h4>
          <DataTable headers={["Account", "Amount"]}>
            {sheet.assets.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-2">
                  {row.code} {row.name}
                </td>
                <td className="px-4 py-2 sans">{formatMoney(row.balanceCents, business.currency)}</td>
              </tr>
            ))}
            <tr className="border-t font-medium">
              <td className="px-4 py-3">Total assets</td>
              <td className="px-4 py-3 sans">{formatMoney(sheet.totals.assets, business.currency)}</td>
            </tr>
          </DataTable>
        </div>
        <div>
          <h4 className="mb-2 sans text-sm text-[var(--muted)]">Liabilities and equity</h4>
          <DataTable headers={["Account", "Amount"]}>
            {sheet.liabilities.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-2">
                  {row.code} {row.name}
                </td>
                <td className="px-4 py-2 sans">{formatMoney(row.balanceCents, business.currency)}</td>
              </tr>
            ))}
            {sheet.equity.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-2">
                  {row.code} {row.name}
                </td>
                <td className="px-4 py-2 sans">{formatMoney(row.balanceCents, business.currency)}</td>
              </tr>
            ))}
            <tr className="border-t border-[var(--line)]">
              <td className="px-4 py-2">Current year earnings</td>
              <td className="px-4 py-2 sans">{formatMoney(sheet.retainedCents, business.currency)}</td>
            </tr>
            <tr className="border-t font-medium">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3 sans">
                {formatMoney(sheet.totals.liabilitiesAndEquity, business.currency)}
              </td>
            </tr>
          </DataTable>
        </div>
      </div>
    </AppShell>
  );
}
