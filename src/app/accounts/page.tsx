import { AppShell } from "@/components/shell";
import { ButtonLink, DataTable, PageHeader } from "@/components/ui";
import { accountBalanceCents } from "@/lib/ledger";
import { formatMoney } from "@/lib/money";
import { getBusiness, listAccounts } from "@/lib/queries";

export default function AccountsPage() {
  const business = getBusiness();
  const accounts = listAccounts();
  return (
    <AppShell current="accounts">
      <PageHeader title="Chart of accounts" action={<ButtonLink href="/accounts/new">New account</ButtonLink>} />
      <DataTable headers={["Code", "Name", "Type", "Balance"]}>
        {accounts.map((account) => (
          <tr key={account.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{account.code}</td>
            <td className="px-4 py-3">{account.name}</td>
            <td className="px-4 py-3 capitalize">{account.type}</td>
            <td className="px-4 py-3 sans">{formatMoney(accountBalanceCents(account.id), business.currency)}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
