import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect, HuiSwitch } from "@/components/hui";
import { createCapitalAccount } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { accountBalanceCents } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function EquityPage() {
  const tenant = await requireTenant();
  const accounts = (await listAccounts()).filter((a) => a.type === "equity");
  const db = await getDb();
  const capital = await db.all<{
    id: number;
    name: string;
    account_id: number;
    special: number;
    account_name: string;
  }>(
    `SELECT c.*, a.name AS account_name
     FROM capital_accounts c JOIN accounts a ON a.id = c.account_id
     WHERE c.business_id = ? ORDER BY c.name`,
    tenant.business.id,
  );
  const balances = await Promise.all(capital.map((row) => accountBalanceCents(row.account_id)));
  return (
    <AppShell current="equity">
      <PageHeader title="Capital accounts" />
      <p className="mb-6 max-w-2xl text-[var(--muted)]">
        Use special accounts when automatic credit allocations should skip a partner or drawing account.
      </p>
      <form action={createCapitalAccount} className="mb-10 max-w-xl space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <Field label="Name">
          <input className={inputClass} name="name" required placeholder="Partner A capital" />
        </Field>
        <Field label="Equity account">
          <HuiSelect name="account_id" value={String(accounts[0]?.id ?? "")} options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))} />
        </Field>
        <HuiSwitch name="special" label="Special account (skip automatic allocations)" />
        <PrimaryButton>Add capital account</PrimaryButton>
      </form>
      <DataTable headers={["Name", "GL account", "Special", "Balance"]}>
        {capital.map((row, index) => (
          <tr key={row.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{row.name}</td>
            <td className="px-4 py-3">{row.account_name}</td>
            <td className="px-4 py-3">{row.special ? "Yes" : "No"}</td>
            <td className="px-4 py-3 sans">{formatMoney(balances[index], tenant.business.currency)}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
