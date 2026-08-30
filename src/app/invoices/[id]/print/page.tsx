import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { getBusiness, getInvoice } from "@/lib/queries";
import { requireTenant } from "@/lib/tenant";

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await requireTenant();
  const invoice = await getInvoice(Number(id));
  if (!invoice) notFound();
  const business = await getBusiness();
  return (
    <article className={`mx-auto max-w-2xl bg-white p-10 theme-${tenant.business.invoice_theme || "classic"}`}>
      <p className="sans text-xs tracking-[0.2em] uppercase text-stone-500">Invoice</p>
      <h1 className="mt-2 text-4xl">{business.name}</h1>
      <p className="mt-6 sans">
        {invoice.number} · {invoice.date}
        {invoice.due_date ? ` · due ${invoice.due_date}` : ""}
      </p>
      <p className="mt-4">
        Bill to
        <br />
        <strong>{invoice.customer_name}</strong>
        <br />
        {invoice.address}
      </p>
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Description</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line) => (
            <tr key={line.id} className="border-b">
              <td className="py-2">{line.description}</td>
              <td>{line.qty}</td>
              <td>{formatMoney(Math.round(line.qty * line.unit_cents), business.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-6 sans">Total {formatMoney(invoice.totalCents, business.currency)}</p>
      <p className="sans">Balance {formatMoney(invoice.balanceCents, business.currency)}</p>
      {invoice.notes ? <p className="mt-6">{invoice.notes}</p> : null}
      {tenant.business.footer_text ? <p className="mt-10 text-sm text-stone-500">{tenant.business.footer_text}</p> : null}
    </article>
  );
}
