import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { DataTable, PageHeader } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { getBusiness, getJournalEntry } from "@/lib/queries";

export default async function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getJournalEntry(Number(id));
  if (!entry) notFound();
  const business = await getBusiness();
  return (
    <AppShell current="journals">
      <PageHeader title={entry.memo || `Entry ${entry.id}`} />
      <p className="mb-6 text-[var(--muted)] sans">
        {entry.date} · {entry.source_type.replaceAll("_", " ")}
      </p>
      <DataTable headers={["Account", "Debit", "Credit", "Memo"]}>
        {entry.lines.map((line) => (
          <tr key={line.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">
              {line.code} {line.account_name}
            </td>
            <td className="px-4 py-3 sans">{line.debit_cents ? formatMoney(line.debit_cents, business.currency) : ""}</td>
            <td className="px-4 py-3 sans">{line.credit_cents ? formatMoney(line.credit_cents, business.currency) : ""}</td>
            <td className="px-4 py-3">{line.memo}</td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
