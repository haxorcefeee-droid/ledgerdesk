import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { DataTable, PageHeader, PrimaryButton } from "@/components/ui";
import { cloneDocument, postDocument } from "@/lib/extra-actions";
import { formatMoney } from "@/lib/money";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await requireTenant();
  const db = await getDb();
  const doc = await db.get<{
    id: number;
    kind: string;
    number: string;
    date: string;
    status: string;
    notes: string;
    reference: string;
    party_id: number | null;
  }>("SELECT * FROM documents WHERE id = ? AND business_id = ?", Number(id), tenant.business.id);
  if (!doc) notFound();
  const party = doc.party_id
    ? await db.get<{ name: string }>("SELECT name FROM parties WHERE id = ?", doc.party_id)
    : null;
  const lines = await db.all<{ id: number; description: string; qty: number; unit_cents: number }>(
    "SELECT * FROM document_lines WHERE document_id = ? ORDER BY id",
    doc.id,
  );
  const total = lines.reduce((sum, line) => sum + Math.round(line.qty * line.unit_cents), 0);
  const copyKind = doc.kind === "quote" ? "order" : doc.kind === "order" ? "invoice" : doc.kind === "purchase_quote" ? "purchase_order" : doc.kind === "purchase_order" ? "bill" : doc.kind;
  return (
    <AppShell current="invoices">
      <PageHeader title={`${doc.kind} ${doc.number}`} />
      <p className="mb-4 text-[var(--muted)]">
        {party?.name ?? "No party"} · {doc.date} · {doc.status}
        {doc.reference ? ` · ${doc.reference}` : ""}
      </p>
      <div className="no-print mb-6 flex flex-wrap gap-3">
        {doc.status === "draft" ? (
          <form action={postDocument}>
            <input type="hidden" name="id" value={doc.id} />
            <PrimaryButton>Post</PrimaryButton>
          </form>
        ) : null}
        <form action={cloneDocument}>
          <input type="hidden" name="id" value={doc.id} />
          <input type="hidden" name="kind" value={doc.kind} />
          <button className="sans rounded-md border border-[var(--line)] px-4 py-2 text-sm">Clone</button>
        </form>
        <form action={cloneDocument}>
          <input type="hidden" name="id" value={doc.id} />
          <input type="hidden" name="kind" value={copyKind} />
          <button className="sans rounded-md border border-[var(--line)] px-4 py-2 text-sm">Copy to {copyKind}</button>
        </form>
        <Link className="sans rounded-md border border-[var(--line)] px-4 py-2 text-sm" href={`/invoices/${doc.id}/print`}>
          Print
        </Link>
      </div>
      <DataTable headers={["Description", "Qty", "Amount"]}>
        {lines.map((line) => (
          <tr key={line.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{line.description}</td>
            <td className="px-4 py-3 sans">{line.qty}</td>
            <td className="px-4 py-3 sans">{formatMoney(Math.round(line.qty * line.unit_cents), tenant.business.currency)}</td>
          </tr>
        ))}
      </DataTable>
      <p className="mt-4 sans">Total {formatMoney(total, tenant.business.currency)}</p>
      {doc.notes ? <p className="mt-4">{doc.notes}</p> : null}
    </AppShell>
  );
}
