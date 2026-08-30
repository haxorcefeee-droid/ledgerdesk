import { NextResponse } from "next/server";
import { formatMoney } from "@/lib/money";
import { invoicePdfBytes } from "@/lib/pdf";
import { getBusiness, getInvoice } from "@/lib/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = getInvoice(Number(id));
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const business = getBusiness();
  const bytes = invoicePdfBytes({
    businessName: business.name,
    currency: business.currency,
    number: invoice.number,
    date: invoice.date,
    dueDate: invoice.due_date,
    customerName: invoice.customer_name,
    address: invoice.address,
    notes: invoice.notes,
    lines: invoice.lines.map((line) => ({
      description: line.description,
      qty: line.qty,
      unitLabel: formatMoney(line.unit_cents, business.currency),
      totalLabel: formatMoney(Math.round(line.qty * line.unit_cents), business.currency),
    })),
    totalLabel: formatMoney(invoice.totalCents, business.currency),
    paidLabel: formatMoney(invoice.paidCents, business.currency),
    balanceLabel: formatMoney(invoice.balanceCents, business.currency),
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
    },
  });
}
