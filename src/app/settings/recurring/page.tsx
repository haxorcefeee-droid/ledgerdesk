import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createRecurring } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { todayIso } from "@/lib/money";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function RecurringPage() {
  const tenant = await requireTenant();
  const accounts = await listAccounts();
  const db = await getDb();
  const rows = await db.all<{
    id: number;
    kind: string;
    next_date: string;
    interval_days: number;
    active: number;
    template_json: string;
  }>("SELECT * FROM recurring WHERE business_id = ? ORDER BY next_date", tenant.business.id);
  return (
    <AppShell current="settings">
      <PageHeader title="Recurring transactions" />
      <p className="mb-6 max-w-2xl text-[var(--muted)]">
        Daily cron creates the next draft document when <span className="sans">next_date</span> is due.
      </p>
      <form action={createRecurring} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Kind">
          <HuiSelect
            name="kind"
            value="invoice"
            options={[
              { value: "invoice", label: "Sales invoice" },
              { value: "bill", label: "Purchase bill" },
            ]}
          />
        </Field>
        <Field label="Next date">
          <input className={inputClass} type="date" name="next_date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Interval (days)">
          <input className={inputClass} name="interval_days" defaultValue="30" />
        </Field>
        <Field label="Amount">
          <input className={inputClass} name="amount" defaultValue="0" />
        </Field>
        <Field label="Account">
          <HuiSelect
            name="account_id"
            value={String(accounts.find((a) => a.type === "income")?.id ?? "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <Field label="Memo">
          <input className={inputClass} name="memo" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Schedule</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Kind", "Next", "Interval", "Active", "Template"]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{row.kind}</td>
            <td className="px-4 py-3 sans">{row.next_date}</td>
            <td className="px-4 py-3 sans">{row.interval_days}d</td>
            <td className="px-4 py-3">{row.active ? "Yes" : "No"}</td>
            <td className="px-4 py-3 sans text-xs">{row.template_json}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
