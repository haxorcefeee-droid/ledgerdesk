import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { createEmployee } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";

export default async function EmployeesPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const employees = await db.all<{
    id: number;
    name: string;
    email: string;
    role_title: string;
    pay_cents: number;
  }>("SELECT * FROM employees WHERE business_id = ? ORDER BY name", tenant.business.id);
  return (
    <AppShell current="payroll">
      <PageHeader title="Employees" />
      <form action={createEmployee} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Email">
          <input className={inputClass} name="email" type="email" />
        </Field>
        <Field label="Role">
          <input className={inputClass} name="role_title" />
        </Field>
        <Field label="Gross pay">
          <input className={inputClass} name="pay" defaultValue="0" />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Add employee</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Name", "Email", "Role", "Pay"]}>
        {employees.map((employee) => (
          <tr key={employee.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{employee.name}</td>
            <td className="px-4 py-3 sans">{employee.email}</td>
            <td className="px-4 py-3">{employee.role_title}</td>
            <td className="px-4 py-3 sans">{formatMoney(employee.pay_cents, tenant.business.currency)}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
