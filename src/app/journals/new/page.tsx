import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/ui";
import { listAccounts } from "@/lib/queries";
import { JournalForm } from "./journal-form";

export default function NewJournalPage() {
  const accounts = listAccounts();
  return (
    <AppShell current="journals">
      <PageHeader title="New journal entry" />
      <p className="mb-6 max-w-xl text-[var(--muted)]">Debits must equal credits. Unbalanced entries are rejected.</p>
      <JournalForm accounts={accounts} />
    </AppShell>
  );
}
