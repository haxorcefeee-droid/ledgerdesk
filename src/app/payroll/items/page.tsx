import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createPayslipItemType } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function PayslipItemsPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const items = await db.all<{ id: number; entity: string; defaults_json: string }>(
    "SELECT * FROM form_defaults WHERE business_id = ? AND entity LIKE 'payslip_item:%' ORDER BY id",
    tenant.business.id,
  );
  return (
    <AppShell current="payroll">
      <PageHeader title="Payslip item types" />
      <form action={createPayslipItemType} className="mb-8 grid max-w-xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} name="name" required placeholder="Overtime" />
        </Field>
        <Field label="Kind">
          <HuiSelect
            name="kind"
            value="earning"
            options={[
              { value: "earning", label: "Earning" },
              { value: "deduction", label: "Deduction" },
            ]}
          />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Add type</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Name", "Kind"]}>
        {items.map((item) => {
          const parsed = JSON.parse(item.defaults_json || "{}") as { name?: string; kind?: string };
          return (
            <tr key={item.id} className="border-t border-[var(--line)]">
              <td className="px-4 py-3">{parsed.name ?? item.entity}</td>
              <td className="px-4 py-3">{parsed.kind ?? "earning"}</td>
            </tr>
          );
        })}
      </DataTable>
    </AppShell>
  );
}
