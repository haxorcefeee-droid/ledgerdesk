import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { addKitComponent, createItem } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function ItemsPage() {
  const tenant = await requireTenant();
  const accounts = await listAccounts();
  const db = await getDb();
  const items = await db.all<{
    id: number;
    sku: string;
    name: string;
    kind: string;
    costing: string;
    unit_cost_cents: number;
  }>("SELECT * FROM items WHERE business_id = ? ORDER BY name", tenant.business.id);
  const kits = items.filter((item) => item.kind === "kit");
  return (
    <AppShell current="inventory">
      <PageHeader title="Inventory items" />
      <form action={createItem} className="mb-10 grid max-w-3xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-3">
        <Field label="SKU">
          <input className={inputClass} name="sku" />
        </Field>
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Kind">
          <HuiSelect
            name="kind"
            value="inventory"
            options={[
              { value: "inventory", label: "Inventory" },
              { value: "non_inventory", label: "Non-inventory / service" },
              { value: "kit", label: "Kit / bundle" },
            ]}
          />
        </Field>
        <Field label="Costing">
          <HuiSelect
            name="costing"
            value="average"
            options={[
              { value: "average", label: "Average" },
              { value: "fifo", label: "FIFO" },
            ]}
          />
        </Field>
        <Field label="Unit cost">
          <input className={inputClass} name="unit_cost" defaultValue="0" />
        </Field>
        <Field label="Income account">
          <HuiSelect
            name="income_account_id"
            value={String(accounts.find((a) => a.type === "income")?.id ?? "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <Field label="Expense / COGS">
          <HuiSelect
            name="expense_account_id"
            value={String(accounts.find((a) => a.system_key === "cogs")?.id ?? accounts.find((a) => a.type === "expense")?.id ?? "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <Field label="Inventory account">
          <HuiSelect
            name="inventory_account_id"
            value={String(accounts.find((a) => a.system_key === "inventory")?.id ?? "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <div className="md:col-span-3">
          <PrimaryButton>Save item</PrimaryButton>
        </div>
      </form>
      {kits.length > 0 ? (
        <form action={addKitComponent} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-3">
          <Field label="Kit">
            <HuiSelect name="kit_id" value={String(kits[0].id)} options={kits.map((k) => ({ value: String(k.id), label: k.name }))} />
          </Field>
          <Field label="Component">
            <HuiSelect
              name="item_id"
              value={String(items.find((i) => i.kind !== "kit")?.id ?? "")}
              options={items.filter((i) => i.kind !== "kit").map((i) => ({ value: String(i.id), label: i.name }))}
            />
          </Field>
          <Field label="Qty">
            <input className={inputClass} name="qty" defaultValue="1" />
          </Field>
          <div className="md:col-span-3">
            <PrimaryButton>Add kit component</PrimaryButton>
          </div>
        </form>
      ) : null}
      <DataTable headers={["SKU", "Name", "Kind", "Costing", "Unit cost"]}>
        {items.map((item) => (
          <tr key={item.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{item.sku}</td>
            <td className="px-4 py-3">{item.name}</td>
            <td className="px-4 py-3">{item.kind}</td>
            <td className="px-4 py-3">{item.costing}</td>
            <td className="px-4 py-3 sans">{formatMoney(item.unit_cost_cents, tenant.business.currency)}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
