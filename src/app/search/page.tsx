import Link from "next/link";
import { AppShell } from "@/components/shell";
import { DataTable, PageHeader } from "@/components/ui";
import { SearchForm } from "@/components/search-form";
import { getDb } from "@/lib/db";
import { requireTenant } from "@/lib/tenant";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const tenant = await requireTenant();
  const q = (await searchParams).q?.trim() ?? "";
  const db = await getDb();
  const like = `%${q}%`;
  const documents = q
    ? await db.all<{ id: number; kind: string; number: string }>(
        "SELECT id, kind, number FROM documents WHERE business_id = ? AND (number LIKE ? OR notes LIKE ? OR reference LIKE ?) ORDER BY id DESC LIMIT 20",
        tenant.business.id,
        like,
        like,
        like,
      )
    : [];
  const parties = q
    ? await db.all<{ id: number; name: string; kind: string }>(
        "SELECT id, name, kind FROM parties WHERE business_id = ? AND (name LIKE ? OR email LIKE ?) ORDER BY name LIMIT 20",
        tenant.business.id,
        like,
        like,
      )
    : [];
  const journals = q
    ? await db.all<{ id: number; memo: string; date: string }>(
        "SELECT id, memo, date FROM journal_entries WHERE business_id = ? AND (memo LIKE ? OR reference LIKE ?) ORDER BY id DESC LIMIT 20",
        tenant.business.id,
        like,
        like,
      )
    : [];
  return (
    <AppShell current="home">
      <PageHeader title="Search" />
      <SearchForm placeholder="Search documents, parties, journals" />
      {!q ? <p className="text-[var(--muted)]">Type a query to search this business.</p> : null}
      {documents.length > 0 ? (
        <>
          <h3 className="mb-3 text-xl">Documents</h3>
          <DataTable headers={["Number", "Kind"]}>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">
                  <Link className="text-teal-800 underline" href={`/documents/${doc.id}`}>
                    {doc.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{doc.kind}</td>
              </tr>
            ))}
          </DataTable>
        </>
      ) : null}
      {parties.length > 0 ? (
        <>
          <h3 className="mt-8 mb-3 text-xl">Parties</h3>
          <DataTable headers={["Name", "Kind"]}>
            {parties.map((party) => (
              <tr key={party.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">{party.name}</td>
                <td className="px-4 py-3">{party.kind}</td>
              </tr>
            ))}
          </DataTable>
        </>
      ) : null}
      {journals.length > 0 ? (
        <>
          <h3 className="mt-8 mb-3 text-xl">Journals</h3>
          <DataTable headers={["Date", "Memo"]}>
            {journals.map((entry) => (
              <tr key={entry.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3 sans">{entry.date}</td>
                <td className="px-4 py-3">
                  <Link className="text-teal-800 underline" href={`/journals/${entry.id}`}>
                    {entry.memo}
                  </Link>
                </td>
              </tr>
            ))}
          </DataTable>
        </>
      ) : null}
    </AppShell>
  );
}
