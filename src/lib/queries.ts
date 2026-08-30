import { getDb } from "./db";
import { asPlain, asPlainList } from "./plain";
import { DEFAULT_MODULES, type Modules } from "./types";

export type Business = {
  id: number;
  name: string;
  currency: string;
  fiscal_year_start: string;
  modules: Modules;
};

export async function getBusiness(): Promise<Business> {
  const db = await getDb();
  const row = await db.get<{
    id: number;
    name: string;
    currency: string;
    fiscal_year_start: string;
    modules_json: string;
  }>("SELECT id, name, currency, fiscal_year_start, modules_json FROM business WHERE id = 1");
  if (!row) throw new Error("Business settings are missing.");
  let modules = DEFAULT_MODULES;
  try {
    modules = { ...DEFAULT_MODULES, ...JSON.parse(row.modules_json) };
  } catch {
    modules = DEFAULT_MODULES;
  }
  return asPlain({ ...row, modules });
}

export async function listAccounts(includeArchived = false) {
  const db = await getDb();
  const sql = includeArchived
    ? "SELECT * FROM accounts ORDER BY code"
    : "SELECT * FROM accounts WHERE archived = 0 ORDER BY code";
  return asPlainList(
    await db.all<{
      id: number;
      code: string;
      name: string;
      type: string;
      is_system: number;
      system_key: string | null;
      archived: number;
    }>(sql),
  );
}

export async function listCashAccounts() {
  const db = await getDb();
  return asPlainList(
    await db.all<{
      id: number;
      name: string;
      account_id: number;
      code: string;
      account_name: string;
    }>(
      `SELECT c.id, c.name, c.account_id, a.code, a.name AS account_name
       FROM cash_accounts c JOIN accounts a ON a.id = c.account_id
       ORDER BY c.name`,
    ),
  );
}

export async function listCustomers() {
  const db = await getDb();
  return asPlainList(
    await db.all<{
      id: number;
      name: string;
      email: string;
      address: string;
    }>("SELECT * FROM customers ORDER BY name"),
  );
}

export async function listJournalEntries() {
  const db = await getDb();
  return asPlainList(
    await db.all<{
      id: number;
      date: string;
      memo: string;
      source_type: string;
      source_id: number | null;
      total_cents: number;
    }>(
      `SELECT e.*,
              (SELECT COALESCE(SUM(debit_cents),0) FROM journal_lines WHERE entry_id = e.id) AS total_cents
       FROM journal_entries e
       ORDER BY e.date DESC, e.id DESC`,
    ),
  );
}

export async function getJournalEntry(id: number) {
  const db = await getDb();
  const entry = await db.get<{
    id: number;
    date: string;
    memo: string;
    source_type: string;
    source_id: number | null;
  }>("SELECT * FROM journal_entries WHERE id = ?", id);
  if (!entry) return null;
  const lines = await db.all<{
    id: number;
    account_id: number;
    debit_cents: number;
    credit_cents: number;
    memo: string;
    code: string;
    account_name: string;
  }>(
    `SELECT l.*, a.code, a.name AS account_name
       FROM journal_lines l JOIN accounts a ON a.id = l.account_id
       WHERE l.entry_id = ?
       ORDER BY l.id`,
    id,
  );
  return { ...entry, lines };
}

export async function listInvoices() {
  const db = await getDb();
  return asPlainList(
    await db.all<{
      id: number;
      number: string;
      customer_id: number;
      customer_name: string;
      date: string;
      due_date: string | null;
      notes: string;
      status: string;
      journal_entry_id: number | null;
      total_cents: number;
      paid_cents: number;
    }>(
      `SELECT i.*, c.name AS customer_name,
              (SELECT COALESCE(SUM(ROUND(qty * unit_cents)), 0) FROM invoice_lines WHERE invoice_id = i.id) AS total_cents,
              (SELECT COALESCE(SUM(amount_cents), 0) FROM invoice_payments WHERE invoice_id = i.id) AS paid_cents
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       ORDER BY i.date DESC, i.id DESC`,
    ),
  );
}

export async function getInvoice(id: number) {
  const db = await getDb();
  const invoice = await db.get<{
    id: number;
    number: string;
    customer_id: number;
    customer_name: string;
    email: string;
    address: string;
    date: string;
    due_date: string | null;
    notes: string;
    status: string;
    journal_entry_id: number | null;
  }>(
    `SELECT i.*, c.name AS customer_name, c.email, c.address
       FROM invoices i JOIN customers c ON c.id = i.customer_id
       WHERE i.id = ?`,
    id,
  );
  if (!invoice) return null;
  const lines = await db.all<{
    id: number;
    description: string;
    qty: number;
    unit_cents: number;
    income_account_id: number;
    income_account_name: string;
  }>(
    `SELECT l.*, a.name AS income_account_name
       FROM invoice_lines l JOIN accounts a ON a.id = l.income_account_id
       WHERE l.invoice_id = ? ORDER BY l.id`,
    id,
  );
  const payments = await db.all<{
    id: number;
    date: string;
    amount_cents: number;
    cash_name: string;
    journal_entry_id: number;
  }>(
    `SELECT p.*, ca.name AS cash_name
       FROM invoice_payments p JOIN cash_accounts ca ON ca.id = p.cash_account_id
       WHERE p.invoice_id = ? ORDER BY p.date, p.id`,
    id,
  );
  const totalCents = lines.reduce((s, l) => s + Math.round(l.qty * l.unit_cents), 0);
  const paidCents = payments.reduce((s, p) => s + p.amount_cents, 0);
  return { ...invoice, lines, payments, totalCents, paidCents, balanceCents: totalCents - paidCents };
}

export async function nextInvoiceNumber(): Promise<string> {
  const db = await getDb();
  const row = await db.get<{ n: number }>("SELECT COUNT(*) AS n FROM invoices");
  return `INV-${String((row?.n ?? 0) + 1).padStart(4, "0")}`;
}
