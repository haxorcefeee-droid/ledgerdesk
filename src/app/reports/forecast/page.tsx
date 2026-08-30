import { AppShell } from "@/components/shell";
import { DataTable, PageHeader } from "@/components/ui";
import { forecast } from "@/lib/reports";
import { formatMoney, todayIso } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";

export default async function ForecastPage() {
  const tenant = await requireTenant();
  const data = await forecast(todayIso());
  return (
    <AppShell current="reports">
      <PageHeader title="Cash forecast" />
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="sans text-sm text-[var(--muted)]">Open receivables</p>
          <p className="mt-2 text-2xl">{formatMoney(data.openReceivables, tenant.business.currency)}</p>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="sans text-sm text-[var(--muted)]">Open payables</p>
          <p className="mt-2 text-2xl">{formatMoney(data.openPayables, tenant.business.currency)}</p>
        </div>
      </div>
      <h3 className="mb-3 text-xl">Upcoming recurring</h3>
      <DataTable headers={["Kind", "Next date", "Template"]}>
        {data.recurring.map((row, index) => (
          <tr key={index} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{row.kind}</td>
            <td className="px-4 py-3 sans">{row.next_date}</td>
            <td className="px-4 py-3 sans text-xs">{row.template_json}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
