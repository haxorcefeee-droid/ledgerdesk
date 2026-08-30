"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { postJournal, systemAccountId } from "./ledger";
import { parseMoney } from "./money";
import { getInvoice, nextInvoiceNumber } from "./queries";
import { requireTenant } from "./tenant";
import { ACCOUNT_TYPES, DEFAULT_MODULES, type AccountType } from "./types";
import { DEFAULT_MODULES as FULL_MODULES, type ModuleKey } from "./modules";

function formString(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export async function updateBusiness(form: FormData) {
  const tenant = await requireTenant();
  const name = formString(form, "name");
  const currency = formString(form, "currency") || "USD";
  const fiscal = formString(form, "fiscal_year_start") || "01-01";
  if (!name) throw new Error("Business name is required.");
  const modules = { ...FULL_MODULES };
  for (const key of Object.keys(FULL_MODULES) as ModuleKey[]) {
    modules[key] = form.get(`module_${key}`) === "on";
  }
  const db = await getDb();
  await db.run(
    "UPDATE businesses SET name = ?, currency = ?, fiscal_year_start = ?, lock_date = ?, locale = ?, date_format = ?, number_format = ?, direction = ?, theme = ?, invoice_theme = ?, footer_text = ?, modules_json = ? WHERE id = ?",
    name,
    currency.toUpperCase(),
    fiscal,
    formString(form, "lock_date") || null,
    formString(form, "locale") || "en-US",
    formString(form, "date_format") || "yyyy-mm-dd",
    formString(form, "number_format") || "1,234.56",
    formString(form, "direction") || "ltr",
    formString(form, "theme") || "light",
    formString(form, "invoice_theme") || "classic",
    formString(form, "footer_text"),
    JSON.stringify({ ...DEFAULT_MODULES, ...modules }),
    tenant.business.id,
  );
  revalidatePath("/");
  redirect("/settings");
}

export async function createAccount(form: FormData) {
  const tenant = await requireTenant();
  const code = formString(form, "code");
  const name = formString(form, "name");
  const type = formString(form, "type") as AccountType;
  if (!code || !name) throw new Error("Code and name are required.");
  if (!ACCOUNT_TYPES.includes(type)) throw new Error("Invalid account type.");
  const db = await getDb();
  await db.run(
    "INSERT INTO accounts (code, name, type, business_id, folder_id) VALUES (?, ?, ?, ?, ?)",
    code,
    name,
    type,
    tenant.business.id,
    Number(formString(form, "folder_id")) || null,
  );
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function createJournal(form: FormData) {
  const tenant = await requireTenant();
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
  await postJournal({
    businessId: tenant.business.id,
    date,
    memo,
    sourceType: "manual",
    lockDate: tenant.business.lock_date,
    reference: formString(form, "reference"),
    lines,
  });
  revalidatePath("/journals");
  redirect("/journals");
}

export async function createCashAccount(form: FormData) {
  const tenant = await requireTenant();
  const name = formString(form, "name");
  const code = formString(form, "code");
  if (!name || !code) throw new Error("Name and account code are required.");
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.run(
      "INSERT INTO accounts (code, name, type, business_id) VALUES (?, ?, 'asset', ?)",
      code,
      name,
      tenant.business.id,
    );
    const account = await tx.get<{ id: number }>(
      "SELECT id FROM accounts WHERE code = ? AND business_id = ?",
      code,
      tenant.business.id,
    );
    if (!account) throw new Error("Failed to create cash GL account.");
    await tx.run(
      "INSERT INTO cash_accounts (name, account_id, business_id, currency) VALUES (?, ?, ?, ?)",
      name,
      account.id,
      tenant.business.id,
      formString(form, "currency") || tenant.business.currency,
    );
  });
  revalidatePath("/cash");
  redirect("/cash");
}

export async function recordCashMove(form: FormData) {
  const tenant = await requireTenant();
  const kind = formString(form, "kind");
  const date = formString(form, "date");
  const memo = formString(form, "memo");
  const cashAccountId = Number(formString(form, "cash_account_id"));
  const offsetAccountId = Number(formString(form, "offset_account_id"));
  const amount = parseMoney(formString(form, "amount"));
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  const db = await getDb();
  const cash = await db.get<{ account_id: number }>(
    "SELECT account_id FROM cash_accounts WHERE id = ?",
    cashAccountId,
  );
  if (!cash) throw new Error("Cash account not found.");
  const journal = {
    businessId: tenant.business.id,
    date,
    lockDate: tenant.business.lock_date,
    sourceId: cashAccountId,
  };
  if (kind === "receipt") {
    await postJournal({
      ...journal,
      memo: memo || "Cash receipt",
      sourceType: "cash_receipt",
      lines: [
        { accountId: cash.account_id, debitCents: amount, creditCents: 0 },
        { accountId: offsetAccountId, debitCents: 0, creditCents: amount },
      ],
    });
  } else {
    await postJournal({
      ...journal,
      memo: memo || "Cash payment",
      sourceType: "cash_payment",
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
  const tenant = await requireTenant();
  const name = formString(form, "name");
  if (!name) throw new Error("Customer name is required.");
  const db = await getDb();
  await db.run(
    "INSERT INTO customers (name, email, address, business_id) VALUES (?, ?, ?, ?)",
    name,
    formString(form, "email"),
    formString(form, "address"),
    tenant.business.id,
  );
  await db.run(
    "INSERT INTO parties (business_id, kind, name, email, address, credit_limit_cents) VALUES (?, 'customer', ?, ?, ?, ?)",
    tenant.business.id,
    name,
    formString(form, "email"),
    formString(form, "address"),
    parseMoney(formString(form, "credit_limit") || "0"),
  );
  revalidatePath("/customers");
  redirect("/customers");
}

export async function createInvoice(form: FormData) {
  const tenant = await requireTenant();
  const customerId = Number(formString(form, "customer_id"));
  const date = formString(form, "date");
  const due = formString(form, "due_date") || null;
  const notes = formString(form, "notes");
  const descriptions = form.getAll("line_description").map(String);
  const qtys = form.getAll("line_qty").map(String);
  const units = form.getAll("line_unit").map(String);
  const incomeIds = form.getAll("line_income_id").map((v) => Number(v));
  const db = await getDb();
  const number = await nextInvoiceNumber();
  const invoiceId = await db.transaction(async (tx) => {
    const result = await tx.run(
      "INSERT INTO invoices (number, customer_id, date, due_date, notes, status, business_id) VALUES (?, ?, ?, ?, ?, 'draft', ?)",
      number,
      customerId,
      date,
      due,
      notes,
      tenant.business.id,
    );
    const id = Number(result.lastInsertRowid);
    for (let i = 0; i < descriptions.length; i++) {
      const desc = descriptions[i].trim();
      if (!desc) continue;
      await tx.run(
        "INSERT INTO invoice_lines (invoice_id, description, qty, unit_cents, income_account_id) VALUES (?, ?, ?, ?, ?)",
        id,
        desc,
        Number(qtys[i] || 1),
        parseMoney(units[i] ?? "0"),
        incomeIds[i],
      );
    }
    return id;
  });
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

export async function postInvoice(invoiceId: number) {
  const tenant = await requireTenant();
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "posted") return;
  if (invoice.lines.length === 0) throw new Error("Add at least one line before posting.");
  const arId = await systemAccountId(tenant.business.id, "accounts_receivable");
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
  const entryId = await postJournal({
    businessId: tenant.business.id,
    date: invoice.date,
    memo: `Sales invoice ${invoice.number}`,
    sourceType: "sales_invoice",
    sourceId: invoiceId,
    lockDate: tenant.business.lock_date,
    lines: [{ accountId: arId, debitCents: invoice.totalCents, creditCents: 0 }, ...creditLines],
  });
  const db = await getDb();
  await db.run("UPDATE invoices SET status = 'posted', journal_entry_id = ? WHERE id = ?", entryId, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/journals");
}

export async function postInvoiceForm(form: FormData) {
  await postInvoice(Number(formString(form, "invoice_id")));
}

export async function recordInvoicePayment(form: FormData) {
  const tenant = await requireTenant();
  const invoiceId = Number(formString(form, "invoice_id"));
  const cashAccountId = Number(formString(form, "cash_account_id"));
  const date = formString(form, "date");
  const amount = parseMoney(formString(form, "amount"));
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status !== "posted") throw new Error("Post the invoice before recording payment.");
  if (amount <= 0) throw new Error("Amount must be greater than zero.");
  if (amount > invoice.balanceCents) throw new Error("Payment cannot exceed the remaining balance.");
  const db = await getDb();
  const cash = await db.get<{ account_id: number }>(
    "SELECT account_id FROM cash_accounts WHERE id = ?",
    cashAccountId,
  );
  if (!cash) throw new Error("Cash account not found.");
  const arId = await systemAccountId(tenant.business.id, "accounts_receivable");
  const entryId = await postJournal({
    businessId: tenant.business.id,
    date,
    memo: `Payment for ${invoice.number}`,
    sourceType: "invoice_payment",
    sourceId: invoiceId,
    lockDate: tenant.business.lock_date,
    lines: [
      { accountId: cash.account_id, debitCents: amount, creditCents: 0 },
      { accountId: arId, debitCents: 0, creditCents: amount },
    ],
  });
  await db.run(
    "INSERT INTO invoice_payments (invoice_id, cash_account_id, date, amount_cents, journal_entry_id) VALUES (?, ?, ?, ?, ?)",
    invoiceId,
    cashAccountId,
    date,
    amount,
    entryId,
  );
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/cash");
  redirect(`/invoices/${invoiceId}`);
}
