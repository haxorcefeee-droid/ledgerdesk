import { AppShell } from "@/components/shell";
import { ButtonLink, DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { createFolder } from "@/lib/extra-actions";
import { accountBalanceCents } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { getBusiness, listAccounts } from "@/lib/queries";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function AccountsPage() {
  const tenant = await requireTenant();
  const business = await getBusiness();
  const accounts = await listAccounts();
  const balances = await Promise.all(accounts.map((account) => accountBalanceCents(account.id)));
  const db = await getDb();
  const folders = await db.all<{ id: number; name: string }>(
    "SELECT * FROM account_folders WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  return (
    <AppShell current="accounts">
      <PageHeader
        title="Chart of accounts"
        action={
          <div className="flex gap-2">
            <ButtonLink href="/accounts/opening">Starting balances</ButtonLink>
            <ButtonLink href="/accounts/new">New account</ButtonLink>
          </div>
        }
      />
      <form action={createFolder} className="mb-6 flex max-w-md items-end gap-3">
        <Field label="Folder">
          <input className={inputClass} name="name" required placeholder="Current assets" />
        </Field>
        <PrimaryButton>Add folder</PrimaryButton>
      </form>
      {folders.length > 0 ? (
        <p className="mb-4 sans text-sm text-[var(--muted)]">Folders: {folders.map((f) => f.name).join(", ")}</p>
      ) : null}
      <DataTable headers={["Code", "Name", "Type", "Balance"]}>
        {accounts.map((account, index) => (
          <tr key={account.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{account.code}</td>
            <td className="px-4 py-3">{account.name}</td>
            <td className="px-4 py-3 capitalize">{account.type}</td>
            <td className="px-4 py-3 sans">{formatMoney(balances[index], business.currency)}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
