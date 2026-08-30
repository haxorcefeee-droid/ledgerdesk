import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { stockAdjust } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { todayIso } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";

export default async function WriteoffsPage() {
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
    memo: string;
    item_name: string;
  }>(
    `SELECT m.*, i.name AS item_name FROM stock_moves m JOIN items i ON i.id = m.item_id
     WHERE m.business_id = ? AND m.kind IN ('adjust','writeoff') ORDER BY m.date DESC`,
    tenant.business.id,
  );
  return (
    <AppShell current="inventory">
      <PageHeader title="Inventory write-offs" />
      <form action={stockAdjust} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <input type="hidden" name="kind" value="writeoff" />
        <Field label="Item">
          <HuiSelect name="item_id" value={String(items[0]?.id ?? "")} options={items.map((i) => ({ value: String(i.id), label: i.name }))} />
        </Field>
        <Field label="Location">
          <HuiSelect name="location_id" value={String(locations[0]?.id ?? "")} options={locations.map((l) => ({ value: String(l.id), label: l.name }))} />
        </Field>
        <Field label="Qty (negative to write off)">
          <input className={inputClass} name="qty" required placeholder="-1" />
        </Field>
        <Field label="Unit cost">
          <input className={inputClass} name="unit_cost" defaultValue="0" />
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Reason">
          <input className={inputClass} name="memo" placeholder="Damage / loss" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Post write-off</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Date", "Item", "Qty", "Reason"]}>
        {moves.map((move) => (
          <tr key={move.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{move.date}</td>
            <td className="px-4 py-3">{move.item_name}</td>
            <td className="px-4 py-3 sans">{move.qty}</td>
            <td className="px-4 py-3">{move.memo}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
