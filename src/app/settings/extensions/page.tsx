import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/ui";

const CATALOG = [
  { key: "bank-import", name: "Bank CSV import", hint: "Map statement files onto reconciliation." },
  { key: "einvoice", name: "E-invoicing", hint: "Export posted invoices as UBL/CII." },
  { key: "webhooks", name: "Outbound webhooks", hint: "Notify integrations when documents post." },
];

export default function ExtensionsPage() {
  return (
    <AppShell current="settings">
      <PageHeader title="Extensions" />
      <p className="mb-6 max-w-2xl text-[var(--muted)]">
        Optional add-ons. Enablement is stored per business in module settings; these connectors can be wired to access tokens and cron jobs.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {CATALOG.map((item) => (
          <div key={item.key} className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-lg">{item.name}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{item.hint}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
