import { AppShell } from "@/components/shell";
import { Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { HuiSelect } from "@/components/hui";
import { DocumentLines } from "@/components/document-lines";
import { createDocument } from "@/lib/extra-actions";
import { todayIso } from "@/lib/money";
import { getDb } from "@/lib/db";
import { listAccounts } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

const KINDS: Record<string, string> = {
  quote: "Sales quote",
  order: "Sales order",
  invoice: "Sales invoice",
  credit: "Credit note",
  delivery: "Delivery note",
  purchase_quote: "Purchase quote",
  purchase_order: "Purchase order",
  bill: "Purchase invoice",
  debit: "Debit note",
  goods_receipt: "Goods receipt",
};

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind = "quote" } = await searchParams;
  const tenant = await requireTenant();
  const db = await getDb();
  const partyKind = kind.startsWith("purchase") || kind === "bill" || kind === "debit" || kind === "goods_receipt" ? "supplier" : "customer";
  const parties = await db.all<{ id: number; name: string }>(
    "SELECT id, name FROM parties WHERE business_id = ? AND kind = ? ORDER BY name",
    tenant.business.id,
    partyKind,
  );
  const projects = await db.all<{ id: number; name: string }>(
    "SELECT id, name FROM projects WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  const accounts = await listAccounts();
  return (
    <AppShell current="invoices">
      <PageHeader title={`New ${KINDS[kind] ?? kind}`} />
      <form action={createDocument} className="space-y-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6">
        <input type="hidden" name="kind" value={kind} />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Party">
            <HuiSelect
              name="party_id"
              value={String(parties[0]?.id ?? "")}
              options={
                parties.length
                  ? parties.map((p) => ({ value: String(p.id), label: p.name }))
                  : [{ value: "", label: "Add a customer or supplier first" }]
              }
            />
          </Field>
          <Field label="Date">
            <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
          </Field>
          <Field label="Due / reference">
            <input className={inputClass} name="reference" placeholder="Custom reference" />
          </Field>
          <Field label="Project">
            <HuiSelect
              name="project_id"
              value=""
              options={[{ value: "", label: "None" }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]}
            />
          </Field>
          <Field label="Discount %">
            <input className={inputClass} name="discount" defaultValue="0" />
          </Field>
        </div>
        <DocumentLines
          accounts={accounts}
          defaultAccountId={String(accounts.find((a) => a.type === (partyKind === "supplier" ? "expense" : "income"))?.id ?? accounts[0]?.id ?? "")}
        />
        <Field label="Notes">
          <textarea className={inputClass} name="notes" rows={2} />
        </Field>
        <PrimaryButton>Save draft</PrimaryButton>
      </form>
    </AppShell>
  );
}
