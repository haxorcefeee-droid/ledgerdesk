import Link from "next/link";
import { AppShell } from "@/components/shell";
import { ButtonLink, DataTable, PageHeader } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { getBusiness, listJournalEntries } from "@/lib/queries";

export default async function JournalsPage() {
  const business = await getBusiness();
  const entries = await listJournalEntries();
  return (
    <AppShell current="journals">
      <PageHeader title="Journal" action={<ButtonLink href="/journals/new">New entry</ButtonLink>} />
      <DataTable headers={["Date", "Memo", "Source", "Amount"]}>
        {entries.map((entry) => (
          <tr key={entry.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3 sans">{entry.date}</td>
            <td className="px-4 py-3">
              <Link className="text-teal-800 underline" href={`/journals/${entry.id}`}>
                {entry.memo || "Untitled"}
              </Link>
            </td>
            <td className="px-4 py-3 sans">{entry.source_type.replaceAll("_", " ")}</td>
            <td className="px-4 py-3 sans">{formatMoney(entry.total_cents, business.currency)}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
