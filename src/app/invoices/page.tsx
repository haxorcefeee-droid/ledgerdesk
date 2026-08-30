import Link from "next/link";
import { AppShell } from "@/components/shell";
import { ButtonLink, DataTable, PageHeader } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { getBusiness, listInvoices } from "@/lib/queries";

export default function InvoicesPage() {
  const business = getBusiness();
  const invoices = listInvoices();
  return (
    <AppShell current="invoices">
      <PageHeader title="Sales invoices" action={<ButtonLink href="/invoices/new">New invoice</ButtonLink>} />
      <DataTable headers={["Number", "Customer", "Date", "Status", "Total", "Balance"]}>
        {invoices.map((invoice) => (
          <tr key={invoice.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">
              <Link className="text-teal-800 underline" href={`/invoices/${invoice.id}`}>
                {invoice.number}
              </Link>
            </td>
            <td className="px-4 py-3">{invoice.customer_name}</td>
            <td className="px-4 py-3 sans">{invoice.date}</td>
            <td className="px-4 py-3 capitalize">{invoice.status}</td>
            <td className="px-4 py-3 sans">{formatMoney(invoice.total_cents, business.currency)}</td>
            <td className="px-4 py-3 sans">
              {formatMoney(invoice.total_cents - invoice.paid_cents, business.currency)}
            </td>
          </tr>
        ))}
      </DataTable>
    </AppShell>
  );
}
