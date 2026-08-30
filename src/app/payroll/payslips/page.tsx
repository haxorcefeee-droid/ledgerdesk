import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createPayslip } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney, todayIso } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";

export default async function PayslipsPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const employees = await db.all<{ id: number; name: string; pay_cents: number }>(
    "SELECT id, name, pay_cents FROM employees WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  const slips = await db.all<{
    id: number;
    date: string;
    memo: string;
    status: string;
    employee_name: string;
    amount: number;
  }>(
    `SELECT p.id, p.date, p.memo, p.status, e.name AS employee_name,
            (SELECT COALESCE(SUM(amount_cents),0) FROM payslip_items WHERE payslip_id = p.id) AS amount
     FROM payslips p JOIN employees e ON e.id = p.employee_id
     WHERE p.business_id = ? ORDER BY p.date DESC`,
    tenant.business.id,
  );
  return (
    <AppShell current="payroll">
      <PageHeader title="Payslips" />
      <form action={createPayslip} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Employee">
          <HuiSelect name="employee_id" value={String(employees[0]?.id ?? "")} options={employees.map((e) => ({ value: String(e.id), label: e.name }))} />
        </Field>
        <Field label="Date">
          <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
        </Field>
        <Field label="Amount">
          <input className={inputClass} name="amount" defaultValue={((employees[0]?.pay_cents ?? 0) / 100).toFixed(2)} required />
        </Field>
        <Field label="Item name">
          <input className={inputClass} name="item_name" defaultValue="Gross pay" />
        </Field>
        <Field label="Memo">
          <input className={inputClass} name="memo" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Post payslip</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Date", "Employee", "Amount", "Status", "Memo"]}>
        {slips.map((slip) => (
          <tr key={slip.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{slip.date}</td>
            <td className="px-4 py-3">{slip.employee_name}</td>
            <td className="px-4 py-3 sans">{formatMoney(Number(slip.amount), tenant.business.currency)}</td>
            <td className="px-4 py-3">{slip.status}</td>
            <td className="px-4 py-3">{slip.memo}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
