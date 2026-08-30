import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createAsset, depreciateAsset } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney, todayIso } from "@/lib/money";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function AssetsPage() {
  const tenant = await requireTenant();
  const accounts = await listAccounts();
  const db = await getDb();
  const assets = await db.all<{
    id: number;
    name: string;
    cost_cents: number;
    residual_cents: number;
    life_months: number;
    accumulated_cents: number;
    start_date: string;
  }>("SELECT * FROM assets WHERE business_id = ? AND kind = 'fixed' ORDER BY name", tenant.business.id);
  return (
    <AppShell current="assets">
      <PageHeader title="Fixed assets" />
      <form action={createAsset} className="mb-10 grid max-w-3xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-3">
        <input type="hidden" name="kind" value="fixed" />
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Cost">
          <input className={inputClass} name="cost" required />
        </Field>
        <Field label="Residual">
          <input className={inputClass} name="residual" defaultValue="0" />
        </Field>
        <Field label="Life (months)">
          <input className={inputClass} name="life_months" defaultValue="60" />
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
        <Field label="Expense account">
          <HuiSelect
            name="expense_account_id"
            value={String(accounts.find((a) => a.system_key === "depreciation")?.id ?? "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <div className="md:col-span-3">
          <PrimaryButton>Add asset</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Name", "Cost", "Accumulated", "Book value", "Depreciate"]}>
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
