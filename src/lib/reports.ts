import { getDb } from "./db";
import { getBusiness } from "./queries";
import type { AccountType } from "./types";

export type TrialRow = {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  debitCents: number;
  creditCents: number;
};

export type NamedBalance = {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  balanceCents: number;
};

function fiscalYearStartDate(asOf: string, startMd: string): string {
  const year = Number(asOf.slice(0, 4));
  const [mm, dd] = startMd.split("-");
  const candidate = `${year}-${mm}-${dd}`;
  if (asOf >= candidate) return candidate;
  return `${year - 1}-${mm}-${dd}`;
}

export async function trialBalance(asOf: string): Promise<TrialRow[]> {
  const db = await getDb();
  const business = await getBusiness();
  const rows = await db.all<{
    id: number;
    code: string;
    name: string;
    type: AccountType;
    debit: number;
    credit: number;
  }>(
    `SELECT a.id, a.code, a.name, a.type,
              COALESCE(SUM(CASE WHEN e.date <= ? THEN l.debit_cents ELSE 0 END), 0) AS debit,
              COALESCE(SUM(CASE WHEN e.date <= ? THEN l.credit_cents ELSE 0 END), 0) AS credit
       FROM accounts a
       LEFT JOIN journal_lines l ON l.account_id = a.id
       LEFT JOIN journal_entries e ON e.id = l.entry_id
       WHERE a.archived = 0 AND a.business_id = ?
       GROUP BY a.id, a.code, a.name, a.type
       ORDER BY a.code`,
    asOf,
    asOf,
    business.id,
  );

  return rows.map((row) => {
    const net = Number(row.debit) - Number(row.credit);
    if (net >= 0) {
      return { id: row.id, code: row.code, name: row.name, type: row.type, debitCents: net, creditCents: 0 };
    }
    return { id: row.id, code: row.code, name: row.name, type: row.type, debitCents: 0, creditCents: -net };
  });
}

export async function profitAndLoss(
  from: string,
  to: string,
): Promise<{ rows: NamedBalance[]; netCents: number }> {
  const db = await getDb();
  const business = await getBusiness();
  const rows = await db.all<{
    id: number;
    code: string;
    name: string;
    type: AccountType;
    debit: number;
    credit: number;
  }>(
    `SELECT a.id, a.code, a.name, a.type,
              COALESCE(SUM(l.debit_cents), 0) AS debit,
              COALESCE(SUM(l.credit_cents), 0) AS credit
       FROM accounts a
       LEFT JOIN journal_lines l ON l.account_id = a.id
       LEFT JOIN journal_entries e ON e.id = l.entry_id AND e.date >= ? AND e.date <= ?
       WHERE a.archived = 0 AND a.business_id = ? AND a.type IN ('income','expense')
       GROUP BY a.id, a.code, a.name, a.type
       ORDER BY a.type DESC, a.code`,
    from,
    to,
    business.id,
  );

  const named = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    balanceCents: row.type === "income" ? Number(row.credit) - Number(row.debit) : Number(row.debit) - Number(row.credit),
  }));
  const income = named.filter((r) => r.type === "income").reduce((s, r) => s + r.balanceCents, 0);
  const expense = named.filter((r) => r.type === "expense").reduce((s, r) => s + r.balanceCents, 0);
  return { rows: named, netCents: income - expense };
}

export async function balanceSheet(asOf: string): Promise<{
  assets: NamedBalance[];
  liabilities: NamedBalance[];
  equity: NamedBalance[];
  retainedCents: number;
  totals: { assets: number; liabilitiesAndEquity: number };
}> {
  const db = await getDb();
  const settings = await getBusiness();
  const yearStart = fiscalYearStartDate(asOf, settings.fiscal_year_start);
  const { netCents } = await profitAndLoss(yearStart, asOf);

  const rows = await db.all<{
    id: number;
    code: string;
    name: string;
    type: AccountType;
    debit: number;
    credit: number;
  }>(
    `SELECT a.id, a.code, a.name, a.type,
              COALESCE(SUM(CASE WHEN e.date <= ? THEN l.debit_cents ELSE 0 END), 0) AS debit,
              COALESCE(SUM(CASE WHEN e.date <= ? THEN l.credit_cents ELSE 0 END), 0) AS credit
       FROM accounts a
       LEFT JOIN journal_lines l ON l.account_id = a.id
       LEFT JOIN journal_entries e ON e.id = l.entry_id
       WHERE a.archived = 0 AND a.business_id = ? AND a.type IN ('asset','liability','equity')
       GROUP BY a.id, a.code, a.name, a.type
       ORDER BY a.code`,
    asOf,
    asOf,
    settings.id,
  );

  const named = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    balanceCents: row.type === "asset" ? Number(row.debit) - Number(row.credit) : Number(row.credit) - Number(row.debit),
  }));

  const assets = named.filter((r) => r.type === "asset");
  const liabilities = named.filter((r) => r.type === "liability");
  const equity = named.filter((r) => r.type === "equity");
  const assetTotal = assets.reduce((s, r) => s + r.balanceCents, 0);
  const liabTotal = liabilities.reduce((s, r) => s + r.balanceCents, 0);
  const equityTotal = equity.reduce((s, r) => s + r.balanceCents, 0) + netCents;

  return {
    assets,
    liabilities,
    equity,
    retainedCents: netCents,
    totals: {
      assets: assetTotal,
      liabilitiesAndEquity: liabTotal + equityTotal,
    },
  };
}

export async function cashFlow(from: string, to: string) {
  const db = await getDb();
  const business = await getBusiness();
  const rows = await db.all<{
    source_type: string;
    debit: number;
    credit: number;
  }>(
    `SELECT e.source_type,
            COALESCE(SUM(l.debit_cents), 0) AS debit,
            COALESCE(SUM(l.credit_cents), 0) AS credit
     FROM journal_entries e
     JOIN journal_lines l ON l.entry_id = e.id
     JOIN accounts a ON a.id = l.account_id
     WHERE e.business_id = ? AND e.date >= ? AND e.date <= ? AND a.type = 'asset'
       AND (a.system_key IS NULL OR a.system_key NOT IN ('accounts_receivable','inventory'))
     GROUP BY e.source_type
     ORDER BY e.source_type`,
    business.id,
    from,
    to,
  );
  const items = rows.map((row) => ({
    source: row.source_type,
    inflowCents: Number(row.debit),
    outflowCents: Number(row.credit),
    netCents: Number(row.debit) - Number(row.credit),
  }));
  return {
    items,
    netCents: items.reduce((sum, item) => sum + item.netCents, 0),
  };
}

export async function agedBalances(kind: "customer" | "supplier", asOf: string) {
  const db = await getDb();
  const business = await getBusiness();
  const docKind = kind === "customer" ? "invoice" : "bill";
  const rows = await db.all<{
    party_id: number;
    party_name: string;
    date: string;
    due_date: string | null;
    total: number;
  }>(
    `SELECT d.party_id, p.name AS party_name, d.date, d.due_date,
            (SELECT COALESCE(SUM(ROUND(qty * unit_cents)),0) FROM document_lines WHERE document_id = d.id) AS total
     FROM documents d
     LEFT JOIN parties p ON p.id = d.party_id
     WHERE d.business_id = ? AND d.kind = ? AND d.status = 'posted' AND d.date <= ?`,
    business.id,
    docKind,
    asOf,
  );
  const buckets = new Map<string, { name: string; current: number; d30: number; d60: number; d90: number }>();
  for (const row of rows) {
    const key = String(row.party_id ?? row.party_name ?? "none");
    const current = buckets.get(key) ?? { name: row.party_name ?? "Unknown", current: 0, d30: 0, d60: 0, d90: 0 };
    const basis = row.due_date || row.date;
    const days = Math.max(0, Math.floor((Date.parse(asOf) - Date.parse(basis)) / 86400000));
    const amount = Number(row.total);
    if (days <= 30) current.current += amount;
    else if (days <= 60) current.d30 += amount;
    else if (days <= 90) current.d60 += amount;
    else current.d90 += amount;
    buckets.set(key, current);
  }
  return [...buckets.values()];
}

export async function taxSummary(from: string, to: string) {
  const db = await getDb();
  const business = await getBusiness();
  return db.all<{ code: string; name: string; rate_bps: number; tax_cents: number }>(
    `SELECT t.code, t.name, t.rate_bps, COALESCE(SUM(d.tax_cents), 0) AS tax_cents
     FROM tax_codes t
     LEFT JOIN documents d ON d.business_id = t.business_id AND d.date >= ? AND d.date <= ?
     WHERE t.business_id = ?
     GROUP BY t.code, t.name, t.rate_bps
     ORDER BY t.code`,
    from,
    to,
    business.id,
  );
}

export async function receiptsPayments(from: string, to: string) {
  const db = await getDb();
  const business = await getBusiness();
  return db.all<{ kind: string; memo: string; date: string; amount_cents: number }>(
    `SELECT source_type AS kind, memo, date,
            (SELECT COALESCE(SUM(debit_cents),0) FROM journal_lines WHERE entry_id = journal_entries.id) AS amount_cents
     FROM journal_entries
     WHERE business_id = ? AND date >= ? AND date <= ?
       AND source_type IN ('cash_receipt','cash_payment','cash_transfer','invoice_payment','expense_claim')
     ORDER BY date DESC`,
    business.id,
    from,
    to,
  );
}

export async function partyStatement(partyId: number) {
  const db = await getDb();
  const business = await getBusiness();
  const party = await db.get<{ id: number; name: string; kind: string; email: string; credit_limit_cents: number }>(
    "SELECT * FROM parties WHERE id = ? AND business_id = ?",
    partyId,
    business.id,
  );
  const docs = await db.all<{
    id: number;
    kind: string;
    number: string;
    date: string;
    status: string;
    total: number;
  }>(
    `SELECT id, kind, number, date, status,
            (SELECT COALESCE(SUM(ROUND(qty * unit_cents)),0) FROM document_lines WHERE document_id = documents.id) AS total
     FROM documents WHERE business_id = ? AND party_id = ? ORDER BY date, id`,
    business.id,
    partyId,
  );
  return { party, docs };
}

export async function forecast(asOf: string) {
  const db = await getDb();
  const business = await getBusiness();
  const openSales = await db.get<{ n: number }>(
    "SELECT COALESCE(SUM((SELECT COALESCE(SUM(ROUND(qty * unit_cents)),0) FROM document_lines WHERE document_id = documents.id)),0) AS n FROM documents WHERE business_id = ? AND kind = 'invoice' AND status = 'posted'",
    business.id,
  );
  const openBills = await db.get<{ n: number }>(
    "SELECT COALESCE(SUM((SELECT COALESCE(SUM(ROUND(qty * unit_cents)),0) FROM document_lines WHERE document_id = documents.id)),0) AS n FROM documents WHERE business_id = ? AND kind = 'bill' AND status = 'posted'",
    business.id,
  );
  const recurring = await db.all<{ kind: string; next_date: string; template_json: string }>(
    "SELECT kind, next_date, template_json FROM recurring WHERE business_id = ? AND active = 1 AND next_date >= ?",
    business.id,
    asOf,
  );
  return {
    openReceivables: Number(openSales?.n ?? 0),
    openPayables: Number(openBills?.n ?? 0),
    recurring,
  };
}
