import { AppShell } from "@/components/shell";
import { DataTable, PageHeader } from "@/components/ui";
import { HuiTabs } from "@/components/hui";
import { agedBalances } from "@/lib/reports";
import { formatMoney, todayIso } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";

export default async function AgedPage() {
  const tenant = await requireTenant();
  const asOf = todayIso();
  const ar = await agedBalances("customer", asOf);
  const ap = await agedBalances("supplier", asOf);
  const table = (rows: typeof ar) => (
    <DataTable headers={["Party", "Current", "31-60", "61-90", "90+", "Total"]}>
      {rows.map((row) => (
        <tr key={row.name} className="border-t border-[var(--line)]">
          <td className="px-4 py-3">{row.name}</td>
          <td className="px-4 py-3 sans">{formatMoney(row.current, tenant.business.currency)}</td>
          <td className="px-4 py-3 sans">{formatMoney(row.d30, tenant.business.currency)}</td>
          <td className="px-4 py-3 sans">{formatMoney(row.d60, tenant.business.currency)}</td>
          <td className="px-4 py-3 sans">{formatMoney(row.d90, tenant.business.currency)}</td>
          <td className="px-4 py-3 sans">
            {formatMoney(row.current + row.d30 + row.d60 + row.d90, tenant.business.currency)}
          </td>
        </tr>
      ))}
    </DataTable>
  );
  return (
    <AppShell current="reports">
      <PageHeader title="Aged receivables / payables" />
      <HuiTabs
        tabs={[
          { id: "ar", label: "Receivables", content: table(ar) },
          { id: "ap", label: "Payables", content: table(ap) },
        ]}
      />
    </AppShell>
  );
}
