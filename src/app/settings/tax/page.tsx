import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect, HuiSwitch } from "@/components/hui";
import { createTaxCode, saveWithholdingSettings } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function TaxPage() {
  const tenant = await requireTenant();
  const accounts = await listAccounts();
  const db = await getDb();
  const codes = await db.all<{
    id: number;
    code: string;
    name: string;
    rate_bps: number;
    inclusive: number;
    reverse_charge: number;
  }>("SELECT * FROM tax_codes WHERE business_id = ? ORDER BY code", tenant.business.id);
  let withholding = { rate: "0", account_id: "" };
  try {
    withholding = { rate: "0", account_id: "", ...JSON.parse((await db.get<{ withholding_json: string }>("SELECT withholding_json FROM businesses WHERE id = ?", tenant.business.id))?.withholding_json || "{}") };
  } catch {
    withholding = { rate: "0", account_id: "" };
  }
  return (
    <AppShell current="settings">
      <PageHeader title="Tax codes" />
      <form action={createTaxCode} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Code">
          <input className={inputClass} name="code" required placeholder="VAT" />
        </Field>
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Rate %">
          <input className={inputClass} name="rate" defaultValue="0" />
        </Field>
        <HuiSwitch name="inclusive" label="Tax inclusive pricing" />
        <HuiSwitch name="reverse_charge" label="Reverse charge VAT" />
        <div className="md:col-span-2">
          <PrimaryButton>Add tax code</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Code", "Name", "Rate", "Inclusive", "Reverse"]}>
        {codes.map((code) => (
          <tr key={code.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{code.code}</td>
            <td className="px-4 py-3">{code.name}</td>
            <td className="px-4 py-3 sans">{(code.rate_bps / 100).toFixed(2)}%</td>
            <td className="px-4 py-3">{code.inclusive ? "Yes" : "No"}</td>
            <td className="px-4 py-3">{code.reverse_charge ? "Yes" : "No"}</td>
          </tr>
        ))}
      </DataTable>
      <h3 className="mt-10 mb-3 text-xl">Withholding defaults</h3>
      <form action={saveWithholdingSettings} className="grid max-w-xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Default rate %">
          <input className={inputClass} name="rate" defaultValue={withholding.rate} />
        </Field>
        <Field label="Account">
          <HuiSelect
            name="account_id"
            value={String(withholding.account_id || accounts[0]?.id || "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Save withholding</PrimaryButton>
        </div>
      </form>
    </AppShell>
  );
}
