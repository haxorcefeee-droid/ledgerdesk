"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { postJournal, systemAccountId } from "./ledger";
import { parseMoney } from "./money";
import { getInvoice, nextInvoiceNumber } from "./queries";
import { ACCOUNT_TYPES, DEFAULT_MODULES, type AccountType, type Modules } from "./types";

function formString(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export async function updateBusiness(form: FormData) {
  const name = formString(form, "name");
  const currency = formString(form, "currency") || "USD";
  const fiscal = formString(form, "fiscal_year_start") || "01-01";
  if (!name) throw new Error("Business name is required.");
  const modules: Modules = {
    cash: form.get("module_cash") === "on",
    customers: form.get("module_customers") === "on",
    invoices: form.get("module_invoices") === "on",
    reports: form.get("module_reports") === "on",
  };
  getDb()
    .prepare("UPDATE business SET name = ?, currency = ?, fiscal_year_start = ?, modules_json = ? WHERE id = 1")
    .run(name, currency.toUpperCase(), fiscal, JSON.stringify({ ...DEFAULT_MODULES, ...modules }));
  revalidatePath("/");
  redirect("/settings");
}

export async function createAccount(form: FormData) {
  const code = formString(form, "code");
  const name = formString(form, "name");
  const type = formString(form, "type") as AccountType;
  if (!code || !name) throw new Error("Code and name are required.");
  if (!ACCOUNT_TYPES.includes(type)) throw new Error("Invalid account type.");
  getDb().prepare("INSERT INTO accounts (code, name, type) VALUES (?, ?, ?)").run(code, name, type);
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function createJournal(form: FormData) {
  const date = formString(form, "date");
  const memo = formString(form, "memo");
  const accountIds = form.getAll("account_id").map((v) => Number(v));
  const debits = form.getAll("debit").map((v) => String(v));
  const credits = form.getAll("credit").map((v) => String(v));
  const lines = accountIds.map((accountId, i) => ({
    accountId,
    debitCents: parseMoney(debits[i] ?? "0"),
    creditCents: parseMoney(credits[i] ?? "0"),
  }));
  postJournal({ date, memo, sourceType: "manual", lines });
  revalidatePath("/journals");
  redirect("/journals");
}

export async function createCashAccount(form: FormData) {
  const name = formString(form, "name");
  const code = formString(form, "code");
  if (!name || !code) throw new Error("Name and account code are required.");
  const db = getDb();
  db.exec("BEGIN");
  try {
    db.prepare("INSERT INTO accounts (code, name, type) VALUES (?, ?, 'asset')").run(code, name);
    const accountId = Number(
      (db.prepare("SELECT id FROM accounts WHERE code = ?").get(code) as { id: number }).id,
    );
    db.prepare("INSERT INTO cash_accounts (name, account_id) VALUES (?, ?)").run(name, accountId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  revalidatePath("/cash");
  redirect("/cash");
}

export async function recordCashMove(form: FormData) {
  const kind = formString(form, "kind");
  const date = formString(form, "date");
  const memo = formString(form, "memo");
  const cashAccountId = Number(formString(form, "cash_account_id"));
  const offsetAccountId = Number(formString(form, "offset_account_id"));
  const amount = parseMoney(formString(form, "amount"));
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  const cash = getDb()
    .prepare("SELECT account_id FROM cash_accounts WHERE id = ?")
    .get(cashAccountId) as { account_id: number } | undefined;
  if (!cash) throw new Error("Cash account not found.");
  if (kind === "receipt") {
    postJournal({
      date,
      memo: memo || "Cash receipt",
      sourceType: "cash_receipt",
      sourceId: cashAccountId,
      lines: [
        { accountId: cash.account_id, debitCents: amount, creditCents: 0 },
        { accountId: offsetAccountId, debitCents: 0, creditCents: amount },
      ],
    });
  } else {
    postJournal({
      date,
      memo: memo || "Cash payment",
      sourceType: "cash_payment",
      sourceId: cashAccountId,
      lines: [
        { accountId: offsetAccountId, debitCents: amount, creditCents: 0 },
        { accountId: cash.account_id, debitCents: 0, creditCents: amount },
      ],
    });
  }
  revalidatePath("/cash");
  revalidatePath("/journals");
  redirect("/cash");
}

export async function createCustomer(form: FormData) {
  const name = formString(form, "name");
  if (!name) throw new Error("Customer name is required.");
  getDb()
    .prepare("INSERT INTO customers (name, email, address) VALUES (?, ?, ?)")
    .run(name, formString(form, "email"), formString(form, "address"));
  revalidatePath("/customers");
  redirect("/customers");
}

export async function createInvoice(form: FormData) {
  const customerId = Number(formString(form, "customer_id"));
  const date = formString(form, "date");
  const due = formString(form, "due_date") || null;
  const notes = formString(form, "notes");
  const descriptions = form.getAll("line_description").map(String);
  const qtys = form.getAll("line_qty").map(String);
  const units = form.getAll("line_unit").map(String);
  const incomeIds = form.getAll("line_income_id").map((v) => Number(v));
  const db = getDb();
  const number = nextInvoiceNumber();
  db.exec("BEGIN");
  let invoiceId: number;
  try {
    const result = db
      .prepare(
        "INSERT INTO invoices (number, customer_id, date, due_date, notes, status) VALUES (?, ?, ?, ?, ?, 'draft')",
      )
      .run(number, customerId, date, due, notes);
    invoiceId = Number(result.lastInsertRowid);
    const insertLine = db.prepare(
      "INSERT INTO invoice_lines (invoice_id, description, qty, unit_cents, income_account_id) VALUES (?, ?, ?, ?, ?)",
    );
    descriptions.forEach((description, i) => {
      const desc = description.trim();
      if (!desc) return;
      insertLine.run(invoiceId, desc, Number(qtys[i] || 1), parseMoney(units[i] ?? "0"), incomeIds[i]);
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

export async function postInvoice(invoiceId: number) {
  const invoice = getInvoice(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "posted") return;
  if (invoice.lines.length === 0) throw new Error("Add at least one line before posting.");
  const arId = systemAccountId("accounts_receivable");
  const byIncome = new Map<number, number>();
  for (const line of invoice.lines) {
    const amount = Math.round(line.qty * line.unit_cents);
    byIncome.set(line.income_account_id, (byIncome.get(line.income_account_id) ?? 0) + amount);
  }
  const creditLines = [...byIncome.entries()].map(([accountId, cents]) => ({
    accountId,
    debitCents: 0,
    creditCents: cents,
  }));
  const entryId = postJournal({
    date: invoice.date,
    memo: `Sales invoice ${invoice.number}`,
    sourceType: "sales_invoice",
    sourceId: invoiceId,
    lines: [{ accountId: arId, debitCents: invoice.totalCents, creditCents: 0 }, ...creditLines],
  });
  getDb().prepare("UPDATE invoices SET status = 'posted', journal_entry_id = ? WHERE id = ?").run(entryId, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/journals");
}

export async function postInvoiceForm(form: FormData) {
  await postInvoice(Number(formString(form, "invoice_id")));
}

export async function recordInvoicePayment(form: FormData) {
  const invoiceId = Number(formString(form, "invoice_id"));
  const cashAccountId = Number(formString(form, "cash_account_id"));
  const date = formString(form, "date");
  const amount = parseMoney(formString(form, "amount"));
  const invoice = getInvoice(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "posted") throw new Error("Post the invoice before recording payment.");
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  if (amount > invoice.balanceCents) throw new Error("Payment cannot exceed the remaining balance.");
  const cash = getDb()
    .prepare("SELECT account_id FROM cash_accounts WHERE id = ?")
    .get(cashAccountId) as { account_id: number } | undefined;
  if (!cash) throw new Error("Cash account not found.");
  const arId = systemAccountId("accounts_receivable");
  const entryId = postJournal({
    date,
    memo: `Payment for ${invoice.number}`,
    sourceType: "invoice_payment",
    sourceId: invoiceId,
    lines: [
      { accountId: cash.account_id, debitCents: amount, creditCents: 0 },
      { accountId: arId, debitCents: 0, creditCents: amount },
    ],
  });
  getDb()
    .prepare(
      "INSERT INTO invoice_payments (invoice_id, cash_account_id, date, amount_cents, journal_entry_id) VALUES (?, ?, ?, ?, ?)",
    )
    .run(invoiceId, cashAccountId, date, amount, entryId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/cash");
  redirect(`/invoices/${invoiceId}`);
}
