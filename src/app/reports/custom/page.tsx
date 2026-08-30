import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { saveCustomReport } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { todayIso } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";
import Link from "next/link";

export default async function CustomReportsPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const saved = await db.all<{ id: number; name: string; config_json: string }>(
    "SELECT * FROM saved_reports WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  return (
    <AppShell current="reports">
      <PageHeader title="Custom report builder" />
      <form action={saveCustomReport} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} name="name" required placeholder="Month-end pack" />
        </Field>
        <Field label="As of">
          <input className={inputClass} type="date" name="asOf" defaultValue={todayIso()} />
        </Field>
        <Field label="From">
          <input className={inputClass} type="date" name="from" defaultValue={todayIso().slice(0, 8) + "01"} />
        </Field>
        <Field label="To">
          <input className={inputClass} type="date" name="to" defaultValue={todayIso()} />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Save configuration</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Name", "Open"]}>
        {saved.map((row) => {
          const config = JSON.parse(row.config_json || "{}") as { asOf?: string; from?: string; to?: string };
          const qs = new URLSearchParams({
            asOf: config.asOf ?? "",
            from: config.from ?? "",
            to: config.to ?? "",
          });
          return (
            <tr key={row.id} className="border-t border-[var(--line)]">
              <td className="px-4 py-3">{row.name}</td>
              <td className="px-4 py-3">
                <Link className="text-teal-800 underline" href={`/reports?${qs.toString()}`}>
                  Run
                </Link>
              </td>
            </tr>
          );
        })}
      </DataTable>
    </AppShell>
  );
}
