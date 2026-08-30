import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { inviteUser } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { ROLE_LABELS, ROLES } from "@/lib/modules";
import { requireTenant } from "@/lib/tenant";

export default async function UsersPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const members = await db.all<{ id: number; name: string; email: string; role: string }>(
    `SELECT u.id, u.name, u.email, m.role
     FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.business_id = ? ORDER BY u.name`,
    tenant.business.id,
  );
  return (
    <AppShell current="settings">
      <PageHeader title="Users and roles" />
      <p className="mb-6 max-w-2xl text-[var(--muted)]">
        Invite someone to this business. Existing emails join this company; new emails create a user.
      </p>
      <form action={inviteUser} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Email">
          <input className={inputClass} name="email" type="email" required />
        </Field>
        <Field label="Temporary password">
          <input className={inputClass} name="password" type="password" minLength={8} required />
        </Field>
        <Field label="Role">
          <HuiSelect
            name="role"
            value="accountant"
            options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
          />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Invite</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Name", "Email", "Role"]}>
        {members.map((member) => (
          <tr key={member.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{member.name}</td>
            <td className="px-4 py-3 sans">{member.email}</td>
            <td className="px-4 py-3">{ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] ?? member.role}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
