import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createInvestment, updateInvestmentPrice } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function InvestmentsPage() {
  const tenant = await requireTenant();
  const accounts = await listAccounts();
  const db = await getDb();
  const rows = await db.all<{
    id: number;
    name: string;
    quantity: number;
    cost_cents: number;
    market_cents: number;
  }>("SELECT * FROM investments WHERE business_id = ? ORDER BY name", tenant.business.id);
  return (
    <AppShell current="assets">
      <PageHeader title="Investments" />
      <form action={createInvestment} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Quantity">
          <input className={inputClass} name="quantity" defaultValue="0" />
        </Field>
        <Field label="Cost">
          <input className={inputClass} name="cost" defaultValue="0" />
        </Field>
        <Field label="Market value">
          <input className={inputClass} name="market" defaultValue="0" />
        </Field>
        <Field label="Account">
          <HuiSelect
            name="account_id"
            value={String(accounts.find((a) => a.type === "asset")?.id ?? "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Add investment</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Name", "Qty", "Cost", "Market", "Update market"]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{row.name}</td>
            <td className="px-4 py-3 sans">{row.quantity}</td>
            <td className="px-4 py-3 sans">{formatMoney(row.cost_cents, tenant.business.currency)}</td>
            <td className="px-4 py-3 sans">{formatMoney(row.market_cents, tenant.business.currency)}</td>
            <td className="px-4 py-3">
              <form action={updateInvestmentPrice} className="flex gap-2">
                <input type="hidden" name="id" value={row.id} />
                <input className={inputClass} name="market" defaultValue={(row.market_cents / 100).toFixed(2)} />
                <button className="sans text-sm text-teal-800 underline">Save</button>
              </form>
            </td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
