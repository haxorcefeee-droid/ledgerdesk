import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createWithholding } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney, todayIso } from "@/lib/money";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function WithholdingPage() {
  const tenant = await requireTenant();
  const accounts = await listAccounts();
  const db = await getDb();
  const parties = await db.all<{ id: number; name: string }>(
    "SELECT id, name FROM parties WHERE business_id = ? AND kind = 'customer' ORDER BY name",
    tenant.business.id,
  );
  const docs = await db.all<{ id: number; number: string; date: string; notes: string }>(
    "SELECT id, number, date, notes FROM documents WHERE business_id = ? AND kind = 'withholding' ORDER BY date DESC",
    tenant.business.id,
  );
  return (
    <AppShell current="withholding">
      <PageHeader title="Withholding tax receipts" />
      <form action={createWithholding} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Customer">
          <HuiSelect name="party_id" value={String(parties[0]?.id ?? "")} options={parties.map((p) => ({ value: String(p.id), label: p.name }))} />
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Amount withheld">
          <input className={inputClass} name="amount" required />
        </Field>
        <Field label="Receivable / tax account">
          <HuiSelect
            name="account_id"
            value={String(accounts.find((a) => a.type === "asset")?.id ?? accounts[0]?.id ?? "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <Field label="Memo">
          <input className={inputClass} name="memo" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Record withholding</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Number", "Date", "Memo"]}>
        {docs.map((doc) => (
          <tr key={doc.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{doc.number}</td>
            <td className="px-4 py-3 sans">{doc.date}</td>
            <td className="px-4 py-3">{doc.notes}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
