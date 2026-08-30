import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { createBankRule } from "@/lib/extra-actions";
import { getDb } from "@/lib/db";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function BankRulesPage() {
  const tenant = await requireTenant();
  const accounts = await listAccounts();
  const db = await getDb();
  const rules = await db.all<{ id: number; pattern: string; kind: string; account_name: string }>(
    `SELECT r.id, r.pattern, r.kind, a.name AS account_name
     FROM bank_rules r JOIN accounts a ON a.id = r.account_id
     WHERE r.business_id = ? ORDER BY r.id DESC`,
    tenant.business.id,
  );
  return (
    <AppShell current="rules">
      <PageHeader title="Bank rules" />
      <p className="mb-6 max-w-2xl text-[var(--muted)]">
        Imported statement lines whose description matches a rule are posted automatically when you apply rules on reconciliation.
      </p>
      <form action={createBankRule} className="mb-10 grid max-w-2xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
        <Field label="Pattern">
          <input className={inputClass} name="pattern" required placeholder="UBER" />
        </Field>
        <Field label="Match">
          <HuiSelect
            name="kind"
            value="contains"
            options={[
              { value: "contains", label: "Contains" },
              { value: "equals", label: "Equals" },
            ]}
          />
        </Field>
        <Field label="Offset account">
          <HuiSelect
            name="account_id"
            value={String(accounts.find((a) => a.type === "expense")?.id ?? accounts[0]?.id ?? "")}
            options={accounts.map((a) => ({ value: String(a.id), label: `${a.code} ${a.name}` }))}
          />
        </Field>
        <div className="md:col-span-2">
          <PrimaryButton>Save rule</PrimaryButton>
        </div>
      </form>
      <DataTable headers={["Pattern", "Match", "Account"]}>
        {rules.map((rule) => (
          <tr key={rule.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{rule.pattern}</td>
            <td className="px-4 py-3">{rule.kind}</td>
            <td className="px-4 py-3">{rule.account_name}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
