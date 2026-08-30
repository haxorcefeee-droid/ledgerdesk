import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { taxSummary } from "@/lib/reports";
import { formatMoney, todayIso } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";

export default async function TaxReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const tenant = await requireTenant();
  const params = await searchParams;
  const to = params.to || todayIso();
  const from = params.from || `${to.slice(0, 4)}-01-01`;
  const rows = await taxSummary(from, to);
  return (
    <AppShell current="reports">
      <PageHeader title="Tax summary" />
      <form className="mb-8 flex flex-wrap items-end gap-3">
        <Field label="From">
          <input className={inputClass} type="date" name="from" defaultValue={from} />
        </Field>
        <Field label="To">
          <input className={inputClass} type="date" name="to" defaultValue={to} />
        </Field>
        <PrimaryButton>Refresh</PrimaryButton>
      </form>
      <DataTable headers={["Code", "Name", "Rate", "Tax"]}>
        {rows.map((row) => (
          <tr key={row.code} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{row.code}</td>
            <td className="px-4 py-3">{row.name}</td>
            <td className="px-4 py-3 sans">{(row.rate_bps / 100).toFixed(2)}%</td>
            <td className="px-4 py-3 sans">{formatMoney(Number(row.tax_cents), tenant.business.currency)}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
