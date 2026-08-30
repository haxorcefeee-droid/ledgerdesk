import { getDb } from "./db";
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

export function trialBalance(asOf: string): TrialRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.id, a.code, a.name, a.type,
              COALESCE(SUM(CASE WHEN e.date <= ? THEN l.debit_cents ELSE 0 END), 0) AS debit,
              COALESCE(SUM(CASE WHEN e.date <= ? THEN l.credit_cents ELSE 0 END), 0) AS credit
       FROM accounts a
       LEFT JOIN journal_lines l ON l.account_id = a.id
       LEFT JOIN journal_entries e ON e.id = l.entry_id
       WHERE a.archived = 0
       GROUP BY a.id
       ORDER BY a.code`,
    )
    .all(asOf, asOf) as Array<{
    id: number;
    code: string;
    name: string;
    type: AccountType;
    debit: number;
    credit: number;
  }>;

  return rows.map((row) => {
    const net = row.debit - row.credit;
    if (net >= 0) {
      return { id: row.id, code: row.code, name: row.name, type: row.type, debitCents: net, creditCents: 0 };
    }
    return { id: row.id, code: row.code, name: row.name, type: row.type, debitCents: 0, creditCents: -net };
  });
}

export function profitAndLoss(from: string, to: string): { rows: NamedBalance[]; netCents: number } {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.id, a.code, a.name, a.type,
              COALESCE(SUM(l.debit_cents), 0) AS debit,
              COALESCE(SUM(l.credit_cents), 0) AS credit
       FROM accounts a
       LEFT JOIN journal_lines l ON l.account_id = a.id
       LEFT JOIN journal_entries e ON e.id = l.entry_id AND e.date >= ? AND e.date <= ?
       WHERE a.archived = 0 AND a.type IN ('income','expense')
       GROUP BY a.id
       ORDER BY a.type DESC, a.code`,
    )
    .all(from, to) as Array<{
    id: number;
    code: string;
    name: string;
    type: AccountType;
    debit: number;
    credit: number;
  }>;

  const named = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    balanceCents: row.type === "income" ? row.credit - row.debit : row.debit - row.credit,
  }));
  const income = named.filter((r) => r.type === "income").reduce((s, r) => s + r.balanceCents, 0);
  const expense = named.filter((r) => r.type === "expense").reduce((s, r) => s + r.balanceCents, 0);
  return { rows: named, netCents: income - expense };
}

export function balanceSheet(asOf: string): {
  assets: NamedBalance[];
  liabilities: NamedBalance[];
  equity: NamedBalance[];
  retainedCents: number;
  totals: { assets: number; liabilitiesAndEquity: number };
} {
  const db = getDb();
  const business = db.prepare("SELECT fiscal_year_start FROM business WHERE id = 1").get() as {
    fiscal_year_start: string;
  };
  const yearStart = fiscalYearStartDate(asOf, business.fiscal_year_start);
  const { netCents } = profitAndLoss(yearStart, asOf);

  const rows = db
    .prepare(
      `SELECT a.id, a.code, a.name, a.type,
              COALESCE(SUM(CASE WHEN e.date <= ? THEN l.debit_cents ELSE 0 END), 0) AS debit,
              COALESCE(SUM(CASE WHEN e.date <= ? THEN l.credit_cents ELSE 0 END), 0) AS credit
       FROM accounts a
       LEFT JOIN journal_lines l ON l.account_id = a.id
       LEFT JOIN journal_entries e ON e.id = l.entry_id
       WHERE a.archived = 0 AND a.type IN ('asset','liability','equity')
       GROUP BY a.id
       ORDER BY a.code`,
    )
    .all(asOf, asOf) as Array<{
    id: number;
    code: string;
    name: string;
    type: AccountType;
    debit: number;
    credit: number;
  }>;

  const named = rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    balanceCents:
      row.type === "asset" ? row.debit - row.credit : row.credit - row.debit,
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
