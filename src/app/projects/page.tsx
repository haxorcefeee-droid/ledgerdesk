import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { createProject } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";

export default async function ProjectsPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const projects = await db.all<{ id: number; name: string; code: string; status: string }>(
    "SELECT * FROM projects WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  const rows = [];
  for (const project of projects) {
    const income = await db.get<{ n: number }>(
      `SELECT COALESCE(SUM(l.credit_cents - l.debit_cents),0) AS n
       FROM journal_lines l JOIN accounts a ON a.id = l.account_id
       WHERE l.project_id = ? AND a.type = 'income'`,
      project.id,
    );
    const expense = await db.get<{ n: number }>(
      `SELECT COALESCE(SUM(l.debit_cents - l.credit_cents),0) AS n
       FROM journal_lines l JOIN accounts a ON a.id = l.account_id
       WHERE l.project_id = ? AND a.type = 'expense'`,
      project.id,
    );
    const time = await db.get<{ n: number }>(
      "SELECT COALESCE(SUM(hours * rate_cents),0) AS n FROM time_entries WHERE project_id = ?",
      project.id,
    );
    rows.push({
      ...project,
      income: Number(income?.n ?? 0),
      expense: Number(expense?.n ?? 0),
      time: Number(time?.n ?? 0),
    });
  }
  return (
    <AppShell current="projects">
      <PageHeader title="Projects" />
      <form action={createProject} className="mb-10 grid max-w-xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Code">
          <input className={inputClass} name="code" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Create project</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Code", "Name", "Income", "Expense", "Time value", "Profit"]}>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{row.code}</td>
            <td className="px-4 py-3">{row.name}</td>
            <td className="px-4 py-3 sans">{formatMoney(row.income, tenant.business.currency)}</td>
            <td className="px-4 py-3 sans">{formatMoney(row.expense, tenant.business.currency)}</td>
            <td className="px-4 py-3 sans">{formatMoney(row.time, tenant.business.currency)}</td>
            <td className="px-4 py-3 sans">{formatMoney(row.income - row.expense, tenant.business.currency)}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
