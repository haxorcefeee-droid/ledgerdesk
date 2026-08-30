import { AppShell } from "@/components/shell";
import { PageHeader } from "@/components/ui";
import { listAccounts, listCustomers } from "@/lib/queries";
import { InvoiceForm } from "./invoice-form";

export default function NewInvoicePage() {
  const customers = listCustomers();
  const incomeAccounts = listAccounts().filter((a) => a.type === "income");
  return (
    <AppShell current="invoices">
      <PageHeader title="New sales invoice" />
      {customers.length === 0 ? (
        <p className="text-[var(--muted)]">Create a customer first.</p>
      ) : (
        <InvoiceForm customers={customers} incomeAccounts={incomeAccounts} />
      )}
    </AppShell>
  );
}
