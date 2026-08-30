import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { saveFormDefaults } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function FormDefaultsPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const rows = await db.all<{ id: number; entity: string; defaults_json: string }>(
    "SELECT * FROM form_defaults WHERE business_id = ? ORDER BY entity",
    tenant.business.id,
  );
  return (
    <AppShell current="settings">
      <PageHeader title="Form defaults" />
      <form action={saveFormDefaults} className="mb-8 grid max-w-xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Form">
          <HuiSelect
            name="entity"
            value="invoice"
            options={[
              { value: "invoice", label: "Invoice" },
              { value: "bill", label: "Bill" },
              { value: "journal", label: "Journal" },
            ]}
          />
        </Field>
        <Field label="Default currency">
          <input className={inputClass} name="currency" defaultValue={tenant.business.currency} />
        </Field>
        <Field label="Default notes">
          <input className={inputClass} name="notes" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Save defaults</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Form", "Defaults"]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{row.entity}</td>
            <td className="px-4 py-3 sans text-xs">{row.defaults_json}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
