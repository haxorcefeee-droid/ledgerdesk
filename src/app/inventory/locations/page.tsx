import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { createLocation } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function LocationsPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const locations = await db.all<{ id: number; name: string }>(
    "SELECT * FROM locations WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  return (
    <AppShell current="inventory">
      <PageHeader title="Inventory locations" />
      <form action={createLocation} className="mb-8 max-w-md space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Name">
          <input className={inputClass} name="name" required placeholder="Warehouse B" />
        </Field>
        <PrimaryButton>Add location</PrimaryButton>
      </form>
      <DataTable headers={["Location"]}>
        {locations.map((location) => (
          <tr key={location.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{location.name}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
