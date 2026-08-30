import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, inputClass } from "@/components/ui";
import { ColumnTable } from "@/components/column-table";
import { formatMoney } from "@/lib/money";
import { getDb } from "@/lib/db";
import { partyStatement } from "@/lib/reports";
import { requireTenant } from "@/lib/tenant";

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ party?: string }>;
}) {
  const tenant = await requireTenant();
  const partyId = Number((await searchParams).party || 0);
  const db = await getDb();
  const parties = await db.all<{ id: number; name: string; kind: string }>(
    "SELECT id, name, kind FROM parties WHERE business_id = ? ORDER BY name",
    tenant.business.id,
  );
  const statement = partyId ? await partyStatement(partyId) : null;
  return (
    <AppShell current="reports">
      <PageHeader title="Customer / supplier statements" />
      <form className="mb-8 flex flex-wrap items-end gap-3">
        <Field label="Party">
          <select className={inputClass} name="party" defaultValue={partyId || ""}>
            <option value="">Select</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.kind}: {party.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="sans rounded-md bg-teal-800 px-4 py-2 text-sm text-[var(--accent-ink)]">Open</button>
      </form>
      {statement?.party ? (
        <>
          <p className="mb-4 text-[var(--muted)]">
            {statement.party.name} · credit limit {formatMoney(statement.party.credit_limit_cents, tenant.business.currency)}
          </p>
          <ColumnTable
            columns={[
              { key: "number", label: "Number" },
              { key: "kind", label: "Kind" },
              { key: "date", label: "Date" },
              { key: "status", label: "Status" },
              { key: "total", label: "Total" },
            ]}
            rows={statement.docs.map((doc) => ({
              number: doc.number,
              kind: doc.kind,
              date: doc.date,
              status: doc.status,
              total: formatMoney(Number(doc.total), tenant.business.currency),
            }))}
          />
        </>
      ) : (
        <DataTable headers={["Party", "Kind"]}>
          {parties.map((party) => (
            <tr key={party.id} className="border-t border-[var(--line)]">
              <td className="px-4 py-3">
                <a className="text-teal-800 underline" href={`/reports/statements?party=${party.id}`}>
                  {party.name}
                </a>
              </td>
              <td className="px-4 py-3">{party.kind}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </AppShell>
  );
}
