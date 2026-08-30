import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createAsset, depreciateAsset } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney, todayIso } from "@/lib/money";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function IntangiblesPage() {
  const tenant = await requireTenant();
  const accounts = await listAccounts();
  const db = await getDb();
  const assets = await db.all<{
    id: number;
    name: string;
    cost_cents: number;
    accumulated_cents: number;
  }>("SELECT * FROM assets WHERE business_id = ? AND kind = 'intangible' ORDER BY name", tenant.business.id);
  return (
    <AppShell current="assets">
      <PageHeader title="Intangible assets" />
      <form action={createAsset} className="mb-10 grid max-w-3xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-3">
        <input type="hidden" name="kind" value="intangible" />
        <Field label="Name">
          <input className={inputClass} name="name" required placeholder="Patent / license" />
        </Field>
        <Field label="Cost">
          <input className={inputClass} name="cost" required />
        </Field>
        <Field label="Life (months)">
          <input className={inputClass} name="life_months" defaultValue="36" />
        </Field>
        <Field label="Start date">
          <input className={inputClass} type="date" name="start_date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Asset account">
          <HuiSelect
            name="account_id"
            value={String(accounts.find((a) => a.type === "asset")?.id ?? "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <Field label="Amortization expense">
          <HuiSelect
            name="expense_account_id"
            value={String(accounts.find((a) => a.system_key === "depreciation")?.id ?? "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <div className="md:col-span-3">
          <PrimaryButton>Add intangible</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Name", "Cost", "Amortized", "Book value", "Amortize"]}>
        {assets.map((asset) => (
          <tr key={asset.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{asset.name}</td>
            <td className="px-4 py-3 sans">{formatMoney(asset.cost_cents, tenant.business.currency)}</td>
            <td className="px-4 py-3 sans">{formatMoney(asset.accumulated_cents, tenant.business.currency)}</td>
            <td className="px-4 py-3 sans">
              {formatMoney(asset.cost_cents - asset.accumulated_cents, tenant.business.currency)}
            </td>
            <td className="px-4 py-3">
              <form action={depreciateAsset} className="flex gap-2">
                <input type="hidden" name="id" value={asset.id} />
                <input className={inputClass} type="date" name="date" defaultValue={todayIso()} />
                <button className="sans text-sm text-teal-800 underline">Post</button>
              </form>
            </td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
