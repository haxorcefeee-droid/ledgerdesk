import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { transferStock } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { todayIso } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";

export default async function InventoryTransfersPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const items = await db.all<{ id: number; name: string }>(
    "SELECT id, name FROM items WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  const locations = await db.all<{ id: number; name: string }>(
    "SELECT id, name FROM locations WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  const moves = await db.all<{
    id: number;
    date: string;
    qty: number;
    kind: string;
    memo: string;
    item_name: string;
    location_name: string | null;
  }>(
    `SELECT m.*, i.name AS item_name, l.name AS location_name
     FROM stock_moves m
     JOIN items i ON i.id = m.item_id
     LEFT JOIN locations l ON l.id = m.location_id
     WHERE m.business_id = ? AND m.kind IN ('transfer_in','transfer_out')
     ORDER BY m.date DESC, m.id DESC`,
    tenant.business.id,
  );
  return (
    <AppShell current="inventory">
      <PageHeader title="Inventory transfers" />
      <form action={transferStock} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Item">
          <HuiSelect name="item_id" value={String(items[0]?.id ?? "")} options={items.map((i) => ({ value: String(i.id), label: i.name }))} />
        </Field>
        <Field label="Qty">
          <input className={inputClass} name="qty" required />
        </Field>
        <Field label="From">
          <HuiSelect name="from_location_id" value={String(locations[0]?.id ?? "")} options={locations.map((l) => ({ value: String(l.id), label: l.name }))} />
        </Field>
        <Field label="To">
          <HuiSelect name="to_location_id" value={String(locations[1]?.id ?? locations[0]?.id ?? "")} options={locations.map((l) => ({ value: String(l.id), label: l.name }))} />
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Unit cost">
          <input className={inputClass} name="unit_cost" defaultValue="0" />
        </Field>
        <Field label="Memo">
          <input className={inputClass} name="memo" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Transfer</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Date", "Item", "Location", "Qty", "Kind", "Memo"]}>
        {moves.map((move) => (
          <tr key={move.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{move.date}</td>
            <td className="px-4 py-3">{move.item_name}</td>
            <td className="px-4 py-3">{move.location_name ?? "—"}</td>
            <td className="px-4 py-3 sans">{move.qty}</td>
            <td className="px-4 py-3">{move.kind}</td>
            <td className="px-4 py-3">{move.memo}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
