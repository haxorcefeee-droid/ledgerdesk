import { AppShell } from "@/components/shell";
import { Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { createAccount } from "@/lib/actions";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";
import { ACCOUNT_TYPES } from "@/lib/types";

export default async function NewAccountPage() {
  const tenant = await requireTenant();
  const db = await getDb();
  const folders = await db.all<{ id: number; name: string }>(
    "SELECT id, name FROM account_folders WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  return (
    <AppShell current="accounts">
      <PageHeader title="New account" />
      <form action={createAccount} className="max-w-xl space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Code">
          <input className={inputClass} name="code" required placeholder="5300" />
        </Field>
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Type">
          <select className={inputClass} name="type" defaultValue="expense">
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Folder">
          <select className={inputClass} name="folder_id" defaultValue="">
            <option value="">None</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </Field>
        <PrimaryButton>Create account</PrimaryButton>
      </form>
    </AppShell>
  );
}
