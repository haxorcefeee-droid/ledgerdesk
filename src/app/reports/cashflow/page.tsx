import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { cashFlow, receiptsPayments } from "@/lib/reports";
import { formatMoney, todayIso } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const tenant = await requireTenant();
  const params = await searchParams;
  const to = params.to || todayIso();
  const from = params.from || `${to.slice(0, 4)}-01-01`;
  const flow = await cashFlow(from, to);
  const summary = await receiptsPayments(from, to);
  return (
    <AppShell current="reports">
      <PageHeader title="Cash flow" />
      <form className="mb-8 flex flex-wrap items-end gap-3">
        <Field label="From">
          <input className={inputClass} type="date" name="from" defaultValue={from} />
        </Field>
        <Field label="To">
          <input className={inputClass} type="date" name="to" defaultValue={to} />
        </Field>
        <PrimaryButton>Refresh</PrimaryButton>
      </form>
      <h3 className="mb-3 text-xl">By source</h3>
      <DataTable headers={["Source", "In", "Out", "Net"]}>
        {flow.items.map((item) => (
          <tr key={item.source} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{item.source}</td>
            <td className="px-4 py-3 sans">{formatMoney(item.inflowCents, tenant.business.currency)}</td>
            <td className="px-4 py-3 sans">{formatMoney(item.outflowCents, tenant.business.currency)}</td>
            <td className="px-4 py-3 sans">{formatMoney(item.netCents, tenant.business.currency)}</td>
          </tr>
        ))}
        <tr className="border-t font-medium">
          <td className="px-4 py-3" colSpan={3}>
            Net cash
          </td>
          <td className="px-4 py-3 sans">{formatMoney(flow.netCents, tenant.business.currency)}</td>
        </tr>
      </DataTable>
      <h3 className="mt-10 mb-3 text-xl">Receipts and payments</h3>
      <DataTable headers={["Date", "Kind", "Memo", "Amount"]}>
        {summary.map((row, index) => (
          <tr key={index} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{row.date}</td>
            <td className="px-4 py-3">{row.kind}</td>
            <td className="px-4 py-3">{row.memo}</td>
            <td className="px-4 py-3 sans">{formatMoney(row.amount_cents, tenant.business.currency)}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
