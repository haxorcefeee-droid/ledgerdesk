import Link from "next/link";
import { AppShell } from "@/components/shell";
import { SearchForm } from "@/components/search-form";
import { ButtonLink, DataTable, PageHeader } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { getBusiness, listInvoices } from "@/lib/queries";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").toLowerCase();
  const business = await getBusiness();
  const invoices = (await listInvoices()).filter(
    (invoice) =>
      !q ||
      invoice.number.toLowerCase().includes(q) ||
      invoice.customer_name.toLowerCase().includes(q),
  );
  return (
    <AppShell current="invoices">
      <PageHeader title="Sales invoices" action={<ButtonLink href="/invoices/new">New invoice</ButtonLink>} />
      <SearchForm placeholder="Search invoices" />
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
