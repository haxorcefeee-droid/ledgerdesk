export function invoicePdfBytes(input: {
  businessName: string;
  currency: string;
  number: string;
  date: string;
  dueDate: string | null;
  customerName: string;
  address: string;
  notes: string;
  lines: Array<{ description: string; qty: number; unitLabel: string; totalLabel: string }>;
  totalLabel: string;
  paidLabel: string;
  balanceLabel: string;
}): Uint8Array {
  const lines: string[] = [
    `${input.businessName}`,
    `Invoice ${input.number}`,
    `Date ${input.date}${input.dueDate ? `  Due ${input.dueDate}` : ""}`,
    `Bill to ${input.customerName}`,
    input.address,
    "",
    ...input.lines.map(
      (line) => `${line.description}  x${line.qty}  ${line.unitLabel}  ${line.totalLabel}`,
    ),
    "",
    `Total ${input.totalLabel}`,
    `Paid ${input.paidLabel}`,
    `Balance ${input.balanceLabel}`,
    input.notes ? `Notes: ${input.notes}` : "",
  ].filter((line) => line !== undefined);

  const escaped = lines.map((line) => pdfEscape(line.slice(0, 110)));
  const contentParts: string[] = ["BT /F1 12 Tf"];
  let y = 760;
  escaped.forEach((line, index) => {
    const size = index === 0 ? 18 : 11;
    contentParts.push(`/F1 ${size} Tf`);
    contentParts.push(`50 ${y} Td (${line}) Tj`);
    contentParts.push("ET BT");
    y -= index === 0 ? 28 : 16;
  });
  contentParts.push("ET");
  const stream = contentParts.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
