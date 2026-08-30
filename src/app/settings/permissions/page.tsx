import { AppShell } from "@/components/shell";
import { DataTable, PageHeader } from "@/components/ui";
import { ROLE_LABELS, ROLES, canManageUsers, canWrite } from "@/lib/modules";

const AREAS = ["home", "sales", "customers", "purchases", "suppliers", "projects", "cash", "reports"];

export default function PermissionsPage() {
  return (
    <AppShell current="settings">
      <PageHeader title="User permissions" />
      <p className="mb-6 max-w-2xl text-[var(--muted)]">
        Access is granted per business membership. Owners and admins manage users; accountants can post; sales and purchases are limited to their tabs.
      </p>
      <DataTable headers={["Role", ...AREAS, "Manage users"]}>
        {ROLES.map((role) => (
          <tr key={role} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{ROLE_LABELS[role]}</td>
            {AREAS.map((area) => (
              <td key={area} className="px-4 py-3 sans">
                {canWrite(role, area) ? "Write" : "View"}
              </td>
            ))}
            <td className="px-4 py-3 sans">{canManageUsers(role) ? "Yes" : "No"}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
