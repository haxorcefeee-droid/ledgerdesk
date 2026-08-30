import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createTimeEntry, invoiceTimeEntries } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney, todayIso } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";

export default async function TimePage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const parties = await db.all<{ id: number; name: string }>(
    "SELECT id, name FROM parties WHERE business_id = ? AND kind = 'customer' ORDER BY name",
    tenant.business.id,
  );
  const projects = await db.all<{ id: number; name: string }>(
    "SELECT id, name FROM projects WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  const entries = await db.all<{
    id: number;
    date: string;
    hours: number;
    rate_cents: number;
    memo: string;
    invoiced: number;
    party_name: string | null;
  }>(
    `SELECT t.*, p.name AS party_name FROM time_entries t
     LEFT JOIN parties p ON p.id = t.party_id
     WHERE t.business_id = ? ORDER BY t.date DESC`,
    tenant.business.id,
  );
  return (
    <AppShell current="time">
      <PageHeader title="Billable time" />
      <form action={createTimeEntry} className="mb-8 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Customer">
          <HuiSelect name="party_id" value={String(parties[0]?.id ?? "")} options={parties.map((p) => ({ value: String(p.id), label: p.name }))} />
        </Field>
        <Field label="Project">
          <HuiSelect name="project_id" value="" options={[{ value: "", label: "None" }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]} />
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Hours">
          <input className={inputClass} name="hours" defaultValue="1" required />
        </Field>
        <Field label="Rate">
          <input className={inputClass} name="rate" required />
        </Field>
        <Field label="Memo">
          <input className={inputClass} name="memo" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Log time</PrimaryButton>
        </div>
      </form>
      <form action={invoiceTimeEntries} className="mb-8 flex flex-wrap items-end gap-3">
        <Field label="Invoice unbilled time for">
          <HuiSelect name="party_id" value={String(parties[0]?.id ?? "")} options={parties.map((p) => ({ value: String(p.id), label: p.name }))} />
        </Field>
        <Field label="Invoice date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} />
        </Field>
        <PrimaryButton>Create invoice</PrimaryButton>
      </form>
      <DataTable headers={["Date", "Customer", "Hours", "Rate", "Amount", "Status"]}>
        {entries.map((entry) => (
          <tr key={entry.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{entry.date}</td>
            <td className="px-4 py-3">{entry.party_name ?? "—"}</td>
            <td className="px-4 py-3 sans">{entry.hours}</td>
            <td className="px-4 py-3 sans">{formatMoney(entry.rate_cents, tenant.business.currency)}</td>
            <td className="px-4 py-3 sans">{formatMoney(Math.round(entry.hours * entry.rate_cents), tenant.business.currency)}</td>
            <td className="px-4 py-3">{entry.invoiced ? "Invoiced" : "Open"}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
