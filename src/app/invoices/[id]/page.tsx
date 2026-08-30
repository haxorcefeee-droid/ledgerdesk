import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell";
import { DataTable, Field, PageHeader, PrimaryButton, inputClass } from "@/components/ui";
import { postInvoiceForm, recordInvoicePayment } from "@/lib/actions";
import { applyLateFee } from "@/lib/extra-actions";
import { formatMoney, todayIso } from "@/lib/money";
import { getBusiness, getInvoice, listCashAccounts } from "@/lib/queries";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(Number(id));
  if (!invoice) notFound();
  const business = await getBusiness();
  const cashAccounts = await listCashAccounts();

  return (
    <AppShell current="invoices">
      <PageHeader title={invoice.number} />
      <p className="mb-2 text-[var(--muted)]">
        {invoice.customer_name} · {invoice.date}
        {invoice.due_date ? ` · due ${invoice.due_date}` : ""} · {invoice.status}
      </p>
      <div className="no-print mb-6 flex flex-wrap gap-3">
        <a className="sans rounded-md border border-[var(--line)] px-4 py-2 text-sm" href={`/invoices/${invoice.id}/pdf`}>
          Download PDF
        </a>
        <Link className="sans rounded-md border border-[var(--line)] px-4 py-2 text-sm" href={`/invoices/${invoice.id}/print`}>
          Print view
        </Link>
        {invoice.status === "draft" && (
          <form action={postInvoiceForm}>
            <input type="hidden" name="invoice_id" value={invoice.id} />
            <PrimaryButton>Post to ledger</PrimaryButton>
          </form>
        )}
      </div>
      <DataTable headers={["Description", "Qty", "Unit", "Amount"]}>
        {invoice.lines.map((line) => (
          <tr key={line.id} className="border-t border-[var(--line)]">
            <td className="px-4 py-3">{line.description}</td>
            <td className="px-4 py-3 sans">{line.qty}</td>
            <td className="px-4 py-3 sans">{formatMoney(line.unit_cents, business.currency)}</td>
            <td className="px-4 py-3 sans">
              {formatMoney(Math.round(line.qty * line.unit_cents), business.currency)}
            </td>
          </tr>
        ))}
      </DataTable>
      <p className="mt-4 sans">
        Total {formatMoney(invoice.totalCents, business.currency)} · Paid{" "}
        {formatMoney(invoice.paidCents, business.currency)} · Balance{" "}
        {formatMoney(invoice.balanceCents, business.currency)}
      </p>
      {invoice.status === "posted" && invoice.balanceCents > 0 && (
        <form action={recordInvoicePayment} className="mt-8 grid max-w-xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-3">
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <Field label="Date">
            <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
          </Field>
          <Field label="Cash account">
            <select className={inputClass} name="cash_account_id">
              {cashAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount">
            <input
              className={inputClass}
              name="amount"
              defaultValue={(invoice.balanceCents / 100).toFixed(2)}
              required
            />
          </Field>
          <div className="md:col-span-3">
            <PrimaryButton>Record payment</PrimaryButton>
          </div>
        </form>
      )}
      {invoice.status === "posted" && invoice.due_date && invoice.due_date < todayIso() && invoice.balanceCents > 0 ? (
        <form action={applyLateFee} className="mt-6 grid max-w-xl gap-4 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-6 md:grid-cols-2">
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <Field label="Late fee date">
            <input className={inputClass} type="date" name="date" defaultValue={todayIso()} required />
          </Field>
          <Field label="Fee amount">
            <input className={inputClass} name="amount" defaultValue={(invoice.balanceCents * 0.02 / 100).toFixed(2)} required />
          </Field>
          <Field label="Memo">
            <input className={inputClass} name="memo" defaultValue="Late payment fee" />
          </Field>
          <div className="md:col-span-2">
            <PrimaryButton>Add late fee</PrimaryButton>
          </div>
        </form>
      ) : null}
    </AppShell>
  );
}
