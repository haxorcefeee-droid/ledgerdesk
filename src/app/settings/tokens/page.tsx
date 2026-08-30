import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { createToken } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function TokensPage({
  searchParams,
}: {
  searchParams: Promise<{ issued?: string }>;
}) {
  const tenant = await requireTenant();
  const issued = (await searchParams).issued;
  const db = await getDb();
  const tokens = await db.all<{ id: number; name: string; created_at: string }>(
    "SELECT id, name, created_at FROM access_tokens WHERE business_id = ? ORDER BY id DESC",
    tenant.business.id,
  );
  return (
    <AppShell current="settings">
      <PageHeader title="Access tokens" />
      {issued ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-teal-800 bg-[var(--panel)] p-4">
          <p className="sans text-sm">New token (copy now): {issued}</p>
          <CopyButton text={issued} />
        </div>
      ) : null}
      <form action={createToken} className="mb-8 max-w-md space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Name">
          <input className={inputClass} name="name" defaultValue="API token" />
        </Field>
        <PrimaryButton>Issue token</PrimaryButton>
      </form>
      <DataTable headers={["Name", "Created"]}>
        {tokens.map((token) => (
          <tr key={token.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{token.name}</td>
            <td className="px-4 py-3 sans">{token.created_at}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
