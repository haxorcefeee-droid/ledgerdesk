import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { createCurrency } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function CurrenciesPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const rows = await db.all<{ id: number; code: string; name: string; rate_to_base: number }>(
    "SELECT * FROM currencies WHERE business_id = ? ORDER BY code",
    tenant.business.id,
  );
  return (
    <AppShell current="settings">
      <PageHeader title="Currencies" />
      <p className="mb-6 text-[var(--muted)]">
        Base currency is {tenant.business.currency}. Rates are units of foreign currency per 1.0000 base.
      </p>
      <form action={createCurrency} className="mb-8 grid max-w-xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-3">
        <Field label="Code">
          <input className={inputClass} name="code" required placeholder="EUR" />
        </Field>
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Rate to base">
          <input className={inputClass} name="rate" defaultValue="1" />
        </Field>
        <div className="md:col-span-3">
          <PrimaryButton>Add currency</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Code", "Name", "Rate"]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{row.code}</td>
            <td className="px-4 py-3">{row.name}</td>
            <td className="px-4 py-3 sans">{(row.rate_to_base / 10000).toFixed(4)}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
