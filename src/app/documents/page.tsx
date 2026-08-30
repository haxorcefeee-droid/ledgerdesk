import Link from "next/link";
import { AppShell } from "@/components/shell";
import { ButtonLink, DataTable, PageHeader } from "@/components/ui";
import { SearchForm } from "@/components/search-form";
import { getDb } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { requireTenant } from "@/lib/tenant";
import { batchDeleteDocuments } from "@/lib/extra-actions";

const titles: Record<string, string> = {
  quote: "Sales quotes",
  order: "Sales orders",
  invoice: "Sales invoices",
  credit: "Credit notes",
  delivery: "Delivery notes",
  purchase_quote: "Purchase quotes",
  purchase_order: "Purchase orders",
  bill: "Purchase invoices",
  debit: "Debit notes",
  goods_receipt: "Goods receipts",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const tenant = await requireTenant();
  const sp = await searchParams;
  const kind = sp.kind ?? "invoice";
  const q = (sp.q ?? "").trim();
  const db = await getDb();
  const rows = await db.all<{
    id: number;
    number: string;
    status: string;
    date: string;
    party_name: string | null;
    total: number;
  }>(
    `SELECT d.id, d.number, d.status, d.date, p.name AS party_name,
            (SELECT COALESCE(SUM(ROUND(qty * unit_cents)),0) FROM document_lines WHERE document_id = d.id) AS total
     FROM documents d
     LEFT JOIN parties p ON p.id = d.party_id
     WHERE d.business_id = ? AND d.kind = ?
       AND (? = '' OR d.number LIKE ? OR COALESCE(p.name,'') LIKE ?)
     ORDER BY d.date DESC, d.number DESC`,
    tenant.business.id,
    kind,
    q,
    `%${q}%`,
    `%${q}%`,
  );

  return (
    <AppShell current={kind}>
      <PageHeader
        title={titles[kind] ?? "Documents"}
        action={<ButtonLink href={`/documents/new?kind=${kind}`}>New</ButtonLink>}
      />
      <SearchForm placeholder="Search number or party" />
      {rows.length === 0 ? (
        <p className="text-[var(--muted)]">Nothing here yet. Create a document to start the workflow.</p>
      ) : (
        <form action={batchDeleteDocuments}>
          <DataTable headers={["", "Number", "Party", "Date", "Status", "Total"]}>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">
                  {row.status === "draft" ? <input type="checkbox" name="id" value={row.id} /> : null}
                </td>
                <td className="px-4 py-3">
                  <Link className="text-teal-800 underline" href={`/documents/${row.id}`}>
                    {row.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{row.party_name ?? "—"}</td>
                <td className="px-4 py-3 sans">{row.date}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3 sans">{formatMoney(Number(row.total), tenant.business.currency)}</td>
              </tr>
            ))}
          </DataTable>
          <button type="submit" className="mt-3 sans text-sm text-[var(--danger)] underline">
            Delete selected drafts
          </button>
        </form>
      )}
    </AppShell>
  );
}
