"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { postJournal, systemAccountId } from "./ledger";
import { parseMoney } from "./money";
import { hashPassword, randomHex } from "./passwords";
import { requireTenant } from "./tenant";
import type { Role } from "./modules";

function s(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function n(form: FormData, key: string): number {
  return Number(s(form, key) || 0);
}

export async function inviteUser(form: FormData) {
  const tenant = await requireTenant();
  if (tenant.role !== "owner" && tenant.role !== "admin") throw new Error("Not allowed.");
  const email = s(form, "email").toLowerCase();
  const name = s(form, "name");
  const password = s(form, "password");
  const role = (s(form, "role") || "readonly") as Role;
  if (!email || !name || !password) throw new Error("Name, email, and password are required.");
  const db = await getDb();
  let user = await db.get<{ id: number }>("SELECT id FROM users WHERE email = ?", email);
  if (!user) {
    const created = await db.run(
      "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
      email,
      name,
      await hashPassword(password),
    );
    user = { id: Number(created.lastInsertRowid) };
  }
  await db.run(
    "INSERT INTO memberships (user_id, business_id, role) VALUES (?, ?, ?)",
    user.id,
    tenant.business.id,
    role,
  );
  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function postOpeningBalances(form: FormData) {
  const tenant = await requireTenant();
  const date = s(form, "date");
  const ids = form.getAll("account_id").map(Number);
  const amounts = form.getAll("amount").map(String);
  const types = form.getAll("type").map(String);
  const equity = await systemAccountId(tenant.business.id, "accounts_receivable").catch(async () => {
    const db = await getDb();
    const row = await db.get<{ id: number }>(
      "SELECT id FROM accounts WHERE business_id = ? AND type = 'equity' ORDER BY code",
      tenant.business.id,
    );
    if (!row) throw new Error("Add an equity account first.");
    return row.id;
  });
  const db = await getDb();
  const equityRow = await db.get<{ id: number }>(
    "SELECT id FROM accounts WHERE business_id = ? AND code = '3000'",
    tenant.business.id,
  );
  const equityId = equityRow?.id ?? equity;
  const lines = [];
  for (let i = 0; i < ids.length; i++) {
    const cents = parseMoney(amounts[i] || "0");
    if (!cents || ids[i] === equityId) continue;
    const assetLike = types[i] === "asset" || types[i] === "expense";
    lines.push({
      accountId: ids[i],
      debitCents: assetLike ? Math.max(cents, 0) : 0,
      creditCents: assetLike ? 0 : Math.max(cents, 0),
    });
  }
  const debit = lines.reduce((sum, l) => sum + l.debitCents, 0);
  const credit = lines.reduce((sum, l) => sum + l.creditCents, 0);
  const plug = debit - credit;
  if (plug !== 0) {
    lines.push({
      accountId: equityId,
      debitCents: plug < 0 ? -plug : 0,
      creditCents: plug > 0 ? plug : 0,
    });
  }
  if (lines.length < 2) throw new Error("Enter at least two opening amounts.");
  await postJournal({
    businessId: tenant.business.id,
    date,
    memo: "Opening balances",
    sourceType: "opening",
    lockDate: tenant.business.lock_date,
    lines,
  });
  revalidatePath("/");
  redirect("/accounts/opening");
}

export async function createFolder(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run("INSERT INTO account_folders (business_id, name) VALUES (?, ?)", tenant.business.id, s(form, "name"));
  redirect("/accounts");
}

export async function createDivision(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO divisions (business_id, name, code) VALUES (?, ?, ?)",
    tenant.business.id,
    s(form, "name"),
    s(form, "code"),
  );
  redirect("/settings");
}

export async function createTaxCode(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO tax_codes (business_id, code, name, rate_bps, inclusive, reverse_charge) VALUES (?, ?, ?, ?, ?, ?)",
    tenant.business.id,
    s(form, "code"),
    s(form, "name"),
    Math.round(Number(s(form, "rate") || 0) * 100),
    form.get("inclusive") === "on" ? 1 : 0,
    form.get("reverse_charge") === "on" ? 1 : 0,
  );
  redirect("/settings/tax");
}

export async function createCurrency(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO currencies (business_id, code, name, rate_to_base) VALUES (?, ?, ?, ?)",
    tenant.business.id,
    s(form, "code").toUpperCase(),
    s(form, "name"),
    Math.round(Number(s(form, "rate") || 1) * 10000),
  );
  redirect("/settings/currencies");
}

export async function createParty(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO parties (business_id, kind, name, email, address, credit_limit_cents, currency) VALUES (?, ?, ?, ?, ?, ?, ?)",
    tenant.business.id,
    s(form, "kind") || "customer",
    s(form, "name"),
    s(form, "email"),
    s(form, "address"),
    parseMoney(s(form, "credit_limit") || "0"),
    s(form, "currency") || tenant.business.currency,
  );
  redirect(s(form, "kind") === "supplier" ? "/purchases/suppliers" : "/sales/customers");
}

export async function createDocument(form: FormData) {
  const tenant = await requireTenant();
  const kind = s(form, "kind");
  const db = await getDb();
  const count = await db.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM documents WHERE business_id = ? AND kind = ?",
    tenant.business.id,
    kind,
  );
  const prefix = kind.slice(0, 3).toUpperCase();
  const number = s(form, "number") || `${prefix}-${String((count?.n ?? 0) + 1).padStart(4, "0")}`;
  const created = await db.run(
    `INSERT INTO documents (business_id, kind, number, party_id, date, due_date, status, currency, notes, reference, project_id, discount_bps)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
    tenant.business.id,
    kind,
    number,
    n(form, "party_id") || null,
    s(form, "date"),
    s(form, "due_date") || null,
    s(form, "currency") || tenant.business.currency,
    s(form, "notes"),
    s(form, "reference"),
    n(form, "project_id") || null,
    Math.round(Number(s(form, "discount") || 0) * 100),
  );
  const id = Number(created.lastInsertRowid);
  const descs = form.getAll("line_description").map(String);
  const qtys = form.getAll("line_qty").map(String);
  const units = form.getAll("line_unit").map(String);
  const accounts = form.getAll("line_account_id").map(Number);
  for (let i = 0; i < descs.length; i++) {
    if (!descs[i].trim()) continue;
    await db.run(
      "INSERT INTO document_lines (document_id, description, qty, unit_cents, account_id, item_id, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      id,
      descs[i],
      Number(qtys[i] || 1),
      parseMoney(units[i] || "0"),
      accounts[i] || null,
      n(form, "item_id") || null,
      n(form, "project_id") || null,
    );
  }
  redirect(`/documents/${id}`);
}

export async function postDocument(form: FormData) {
  const tenant = await requireTenant();
  const id = n(form, "id");
  const db = await getDb();
  const doc = await db.get<{
    id: number;
    kind: string;
    number: string;
    date: string;
    status: string;
    party_id: number | null;
  }>("SELECT * FROM documents WHERE id = ? AND business_id = ?", id, tenant.business.id);
  if (!doc || doc.status === "posted") redirect(`/documents/${id}`);
  const lines = await db.all<{ account_id: number; qty: number; unit_cents: number }>(
    "SELECT account_id, qty, unit_cents FROM document_lines WHERE document_id = ?",
    id,
  );
  const total = lines.reduce((sum, line) => sum + Math.round(line.qty * line.unit_cents), 0);
  await db.run("UPDATE documents SET total = ? WHERE id = ?", total, id);
  const sales = ["quote", "order", "invoice", "credit", "delivery"].includes(doc.kind);
  const controlKey = sales ? "accounts_receivable" : "accounts_payable";
  const controlId = await systemAccountId(tenant.business.id, controlKey);
  const byAccount = new Map<number, number>();
  for (const line of lines) {
    if (!line.account_id) continue;
    byAccount.set(line.account_id, (byAccount.get(line.account_id) ?? 0) + Math.round(line.qty * line.unit_cents));
  }
  const incomeLines = [...byAccount.entries()].map(([accountId, cents]) => ({
    accountId,
    debitCents: sales ? 0 : cents,
    creditCents: sales ? cents : 0,
  }));
  if (doc.kind === "quote" || doc.kind === "order" || doc.kind === "delivery" || doc.kind === "purchase_quote" || doc.kind === "purchase_order" || doc.kind === "goods_receipt") {
    await db.run("UPDATE documents SET status = 'posted' WHERE id = ?", id);
    redirect(`/documents/${id}`);
  }
  const entryId = await postJournal({
    businessId: tenant.business.id,
    date: doc.date,
    memo: `${doc.kind} ${doc.number}`,
    sourceType: sales ? "sales_invoice" : "purchase_invoice",
    sourceId: id,
    lockDate: tenant.business.lock_date,
    lines: [
      { accountId: controlId, debitCents: sales ? total : 0, creditCents: sales ? 0 : total },
      ...incomeLines,
    ],
  });
  await db.run("UPDATE documents SET status = 'posted', journal_entry_id = ? WHERE id = ?", entryId, id);
  revalidatePath(`/documents/${id}`);
  redirect(`/documents/${id}`);
}

export async function cloneDocument(form: FormData) {
  const tenant = await requireTenant();
  const id = n(form, "id");
  const kind = s(form, "kind");
  const db = await getDb();
  const doc = await db.get<Record<string, unknown>>(
    "SELECT * FROM documents WHERE id = ? AND business_id = ?",
    id,
    tenant.business.id,
  );
  if (!doc) throw new Error("Not found.");
  const count = await db.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM documents WHERE business_id = ? AND kind = ?",
    tenant.business.id,
    kind,
  );
  const number = `${kind.slice(0, 3).toUpperCase()}-${String((count?.n ?? 0) + 1).padStart(4, "0")}`;
  const created = await db.run(
    `INSERT INTO documents (business_id, kind, number, party_id, date, due_date, status, currency, notes, reference, project_id, source_id, discount_bps)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
    tenant.business.id,
    kind,
    number,
    doc.party_id,
    doc.date,
    doc.due_date,
    doc.currency,
    doc.notes,
    doc.reference,
    doc.project_id,
    id,
    doc.discount_bps,
  );
  const newId = Number(created.lastInsertRowid);
  const lines = await db.all<Record<string, unknown>>("SELECT * FROM document_lines WHERE document_id = ?", id);
  for (const line of lines) {
    await db.run(
      "INSERT INTO document_lines (document_id, description, qty, unit_cents, account_id, tax_code_id, item_id, project_id, discount_bps) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      newId,
      line.description,
      line.qty,
      line.unit_cents,
      line.account_id,
      line.tax_code_id,
      line.item_id,
      line.project_id,
      line.discount_bps,
    );
  }
  redirect(`/documents/${newId}`);
}

export async function recordTransfer(form: FormData) {
  const tenant = await requireTenant();
  const fromId = n(form, "from_id");
  const toId = n(form, "to_id");
  const amount = parseMoney(s(form, "amount"));
  const db = await getDb();
  const from = await db.get<{ account_id: number }>("SELECT account_id FROM cash_accounts WHERE id = ?", fromId);
  const to = await db.get<{ account_id: number }>("SELECT account_id FROM cash_accounts WHERE id = ?", toId);
  if (!from || !to) throw new Error("Cash accounts not found.");
  const entryId = await postJournal({
    businessId: tenant.business.id,
    date: s(form, "date"),
    memo: s(form, "memo") || "Inter-account transfer",
    sourceType: "cash_transfer",
    lockDate: tenant.business.lock_date,
    lines: [
      { accountId: to.account_id, debitCents: amount, creditCents: 0 },
      { accountId: from.account_id, debitCents: 0, creditCents: amount },
    ],
  });
  await db.run(
    "INSERT INTO bank_moves (business_id, kind, cash_account_id, dest_cash_account_id, date, amount_cents, memo, journal_entry_id) VALUES (?, 'transfer', ?, ?, ?, ?, ?, ?)",
    tenant.business.id,
    fromId,
    toId,
    s(form, "date"),
    amount,
    s(form, "memo"),
    entryId,
  );
  redirect("/cash/transfers");
}

export async function addStatementLine(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO bank_statement_lines (business_id, cash_account_id, date, amount_cents, description) VALUES (?, ?, ?, ?, ?)",
    tenant.business.id,
    n(form, "cash_account_id"),
    s(form, "date"),
    parseMoney(s(form, "amount")),
    s(form, "description"),
  );
  redirect("/cash/reconcile");
}

export async function matchStatement(form: FormData) {
  const db = await getDb();
  await db.run(
    "UPDATE bank_statement_lines SET matched_move_id = ? WHERE id = ?",
    n(form, "move_id") || n(form, "journal_id"),
    n(form, "line_id"),
  );
  redirect("/cash/reconcile");
}

export async function createBankRule(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO bank_rules (business_id, pattern, account_id, kind) VALUES (?, ?, ?, ?)",
    tenant.business.id,
    s(form, "pattern"),
    n(form, "account_id"),
    s(form, "kind") || "contains",
  );
  redirect("/cash/rules");
}

export async function createClaim(form: FormData) {
  const tenant = await requireTenant();
  const amount = parseMoney(s(form, "amount"));
  const expenseId = n(form, "account_id");
  const cashId = n(form, "cash_account_id");
  const db = await getDb();
  const cash = await db.get<{ account_id: number }>("SELECT account_id FROM cash_accounts WHERE id = ?", cashId);
  if (!cash) throw new Error("Cash account required.");
  const entryId = await postJournal({
    businessId: tenant.business.id,
    date: s(form, "date"),
    memo: s(form, "memo") || `Expense claim ${s(form, "payer_name")}`,
    sourceType: "expense_claim",
    lockDate: tenant.business.lock_date,
    lines: [
      { accountId: expenseId, debitCents: amount, creditCents: 0 },
      { accountId: cash.account_id, debitCents: 0, creditCents: amount },
    ],
  });
  await db.run(
    "INSERT INTO expense_claims (business_id, payer_name, date, amount_cents, account_id, memo, status, journal_entry_id) VALUES (?, ?, ?, ?, ?, ?, 'paid', ?)",
    tenant.business.id,
    s(form, "payer_name"),
    s(form, "date"),
    amount,
    expenseId,
    s(form, "memo"),
    entryId,
  );
  redirect("/cash/claims");
}

export async function createTimeEntry(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO time_entries (business_id, party_id, project_id, date, hours, rate_cents, memo) VALUES (?, ?, ?, ?, ?, ?, ?)",
    tenant.business.id,
    n(form, "party_id") || null,
    n(form, "project_id") || null,
    s(form, "date"),
    Number(s(form, "hours") || 0),
    parseMoney(s(form, "rate") || "0"),
    s(form, "memo"),
  );
  redirect("/sales/time");
}

export async function createBillableExpense(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO billable_expenses (business_id, party_id, project_id, date, amount_cents, memo) VALUES (?, ?, ?, ?, ?, ?)",
    tenant.business.id,
    n(form, "party_id") || null,
    n(form, "project_id") || null,
    s(form, "date"),
    parseMoney(s(form, "amount")),
    s(form, "memo"),
  );
  redirect("/sales/expenses");
}

export async function createProject(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO projects (business_id, name, code) VALUES (?, ?, ?)",
    tenant.business.id,
    s(form, "name"),
    s(form, "code"),
  );
  redirect("/projects");
}

export async function createItem(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO items (business_id, sku, name, kind, costing, unit_cost_cents, income_account_id, expense_account_id, inventory_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    tenant.business.id,
    s(form, "sku"),
    s(form, "name"),
    s(form, "kind") || "inventory",
    s(form, "costing") || "average",
    parseMoney(s(form, "unit_cost") || "0"),
    n(form, "income_account_id") || null,
    n(form, "expense_account_id") || null,
    n(form, "inventory_account_id") || null,
  );
  redirect("/inventory/items");
}

export async function createLocation(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run("INSERT INTO locations (business_id, name) VALUES (?, ?)", tenant.business.id, s(form, "name"));
  redirect("/inventory/locations");
}

export async function stockAdjust(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO stock_moves (business_id, item_id, location_id, qty, unit_cost_cents, kind, date, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    tenant.business.id,
    n(form, "item_id"),
    n(form, "location_id") || null,
    Number(s(form, "qty")),
    parseMoney(s(form, "unit_cost") || "0"),
    s(form, "kind") || "adjust",
    s(form, "date"),
    s(form, "memo"),
  );
  redirect("/inventory/writeoffs");
}

export async function createEmployee(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO employees (business_id, name, email, role_title, pay_cents) VALUES (?, ?, ?, ?, ?)",
    tenant.business.id,
    s(form, "name"),
    s(form, "email"),
    s(form, "role_title"),
    parseMoney(s(form, "pay") || "0"),
  );
  redirect("/payroll/employees");
}

export async function createPayslip(form: FormData) {
  const tenant = await requireTenant();
  const wageId = await systemAccountId(tenant.business.id, "wages");
  const liabId = await systemAccountId(tenant.business.id, "payroll_liability");
  const amount = parseMoney(s(form, "amount"));
  const entryId = await postJournal({
    businessId: tenant.business.id,
    date: s(form, "date"),
    memo: `Payslip ${s(form, "memo")}`,
    sourceType: "payroll",
    lockDate: tenant.business.lock_date,
    lines: [
      { accountId: wageId, debitCents: amount, creditCents: 0 },
      { accountId: liabId, debitCents: 0, creditCents: amount },
    ],
  });
  const db = await getDb();
  const created = await db.run(
    "INSERT INTO payslips (business_id, employee_id, date, memo, journal_entry_id, status) VALUES (?, ?, ?, ?, ?, 'posted')",
    tenant.business.id,
    n(form, "employee_id"),
    s(form, "date"),
    s(form, "memo"),
    entryId,
  );
  await db.run(
    "INSERT INTO payslip_items (payslip_id, name, kind, amount_cents) VALUES (?, ?, 'earning', ?)",
    Number(created.lastInsertRowid),
    s(form, "item_name") || "Gross pay",
    amount,
  );
  redirect("/payroll/payslips");
}

export async function createAsset(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO assets (business_id, kind, name, cost_cents, residual_cents, life_months, start_date, account_id, expense_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    tenant.business.id,
    s(form, "kind") || "fixed",
    s(form, "name"),
    parseMoney(s(form, "cost")),
    parseMoney(s(form, "residual") || "0"),
    n(form, "life_months") || 60,
    s(form, "start_date"),
    n(form, "account_id") || null,
    n(form, "expense_account_id") || null,
  );
  redirect(s(form, "kind") === "intangible" ? "/assets/intangibles" : "/assets");
}

export async function depreciateAsset(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  const asset = await db.get<{
    id: number;
    cost_cents: number;
    residual_cents: number;
    life_months: number;
    accumulated_cents: number;
    account_id: number | null;
    expense_account_id: number | null;
    name: string;
  }>("SELECT * FROM assets WHERE id = ? AND business_id = ?", n(form, "id"), tenant.business.id);
  if (!asset?.account_id || !asset.expense_account_id) throw new Error("Asset accounts missing.");
  const remaining = asset.cost_cents - asset.residual_cents - asset.accumulated_cents;
  const monthly = Math.round((asset.cost_cents - asset.residual_cents) / Math.max(asset.life_months, 1));
  const amount = Math.min(remaining, monthly);
  if (amount <= 0) throw new Error("Asset is fully depreciated.");
  await postJournal({
    businessId: tenant.business.id,
    date: s(form, "date"),
    memo: `Depreciation ${asset.name}`,
    sourceType: asset.kind === "intangible" ? "amortization" : "depreciation",
    lockDate: tenant.business.lock_date,
    lines: [
      { accountId: asset.expense_account_id, debitCents: amount, creditCents: 0 },
      { accountId: asset.account_id, debitCents: 0, creditCents: amount },
    ],
  });
  await db.run("UPDATE assets SET accumulated_cents = accumulated_cents + ? WHERE id = ?", amount, asset.id);
  redirect("/assets");
}

export async function createInvestment(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO investments (business_id, name, quantity, cost_cents, market_cents, account_id) VALUES (?, ?, ?, ?, ?, ?)",
    tenant.business.id,
    s(form, "name"),
    Number(s(form, "quantity") || 0),
    parseMoney(s(form, "cost") || "0"),
    parseMoney(s(form, "market") || "0"),
    n(form, "account_id") || null,
  );
  redirect("/assets/investments");
}

export async function createCapitalAccount(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO capital_accounts (business_id, name, account_id, special) VALUES (?, ?, ?, ?)",
    tenant.business.id,
    s(form, "name"),
    n(form, "account_id"),
    form.get("special") === "on" ? 1 : 0,
  );
  redirect("/equity");
}

export async function saveCustomReport(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO saved_reports (business_id, name, config_json) VALUES (?, ?, ?)",
    tenant.business.id,
    s(form, "name"),
    JSON.stringify({ asOf: s(form, "asOf"), from: s(form, "from"), to: s(form, "to") }),
  );
  redirect("/reports/custom");
}

export async function createToken(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  const token = randomHex(24);
  await db.run(
    "INSERT INTO access_tokens (business_id, name, token_hash) VALUES (?, ?, ?)",
    tenant.business.id,
    s(form, "name") || "API token",
    token,
  );
  redirect(`/settings/tokens?issued=${token}`);
}

export async function createRecurring(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO recurring (business_id, kind, next_date, interval_days, template_json, active) VALUES (?, ?, ?, ?, ?, 1)",
    tenant.business.id,
    s(form, "kind"),
    s(form, "next_date"),
    n(form, "interval_days") || 30,
    JSON.stringify({ memo: s(form, "memo"), amount: s(form, "amount"), account_id: n(form, "account_id") }),
  );
  redirect("/settings/recurring");
}

export async function createCustomField(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO custom_fields (business_id, entity, name, kind, options_json, placement, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
    tenant.business.id,
    s(form, "entity"),
    s(form, "name"),
    s(form, "kind"),
    JSON.stringify(s(form, "options").split(",").map((x) => x.trim()).filter(Boolean)),
    s(form, "placement") || "header",
    n(form, "sort_order"),
  );
  redirect("/settings/fields");
}

export async function runRecurringJob() {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const due = await db.all<{
    id: number;
    business_id: number;
    kind: string;
    next_date: string;
    interval_days: number;
    template_json: string;
  }>("SELECT * FROM recurring WHERE active = 1 AND next_date <= ?", today);
  for (const item of due) {
    const next = new Date(item.next_date);
    next.setDate(next.getDate() + item.interval_days);
    await db.run("UPDATE recurring SET next_date = ? WHERE id = ?", next.toISOString().slice(0, 10), item.id);
    await db.run(
      "INSERT INTO documents (business_id, kind, number, date, status, currency, notes, recurring_id) VALUES (?, ?, ?, ?, 'draft', 'USD', ?, ?)",
      item.business_id,
      item.kind,
      `REC-${item.id}-${item.next_date}`,
      item.next_date,
      item.template_json,
      item.id,
    );
  }
  return { processed: due.length };
}

export async function runDepreciationJob() {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const assets = await db.all<{
    id: number;
    business_id: number;
    kind: string;
    name: string;
    cost_cents: number;
    residual_cents: number;
    life_months: number;
    accumulated_cents: number;
    account_id: number | null;
    expense_account_id: number | null;
  }>("SELECT * FROM assets WHERE account_id IS NOT NULL AND expense_account_id IS NOT NULL");
  let posted = 0;
  for (const asset of assets) {
    const remaining = asset.cost_cents - asset.residual_cents - asset.accumulated_cents;
    const monthly = Math.round((asset.cost_cents - asset.residual_cents) / Math.max(asset.life_months, 1));
    const amount = Math.min(remaining, monthly);
    if (amount <= 0) continue;
    await postJournal({
      businessId: asset.business_id,
      date: today,
      memo: `Scheduled ${asset.kind === "intangible" ? "amortization" : "depreciation"} ${asset.name}`,
      sourceType: asset.kind === "intangible" ? "amortization" : "depreciation",
      lines: [
        { accountId: asset.expense_account_id!, debitCents: amount, creditCents: 0 },
        { accountId: asset.account_id!, debitCents: 0, creditCents: amount },
      ],
    });
    await db.run("UPDATE assets SET accumulated_cents = accumulated_cents + ? WHERE id = ?", amount, asset.id);
    posted += 1;
  }
  return { scanned: assets.length, posted };
}

export async function transferStock(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  const qty = Number(s(form, "qty"));
  const date = s(form, "date");
  const itemId = n(form, "item_id");
  const cost = parseMoney(s(form, "unit_cost") || "0");
  await db.run(
    "INSERT INTO stock_moves (business_id, item_id, location_id, qty, unit_cost_cents, kind, date, memo) VALUES (?, ?, ?, ?, ?, 'transfer_out', ?, ?)",
    tenant.business.id,
    itemId,
    n(form, "from_location_id"),
    -Math.abs(qty),
    cost,
    date,
    s(form, "memo") || "Inventory transfer",
  );
  await db.run(
    "INSERT INTO stock_moves (business_id, item_id, location_id, qty, unit_cost_cents, kind, date, memo) VALUES (?, ?, ?, ?, ?, 'transfer_in', ?, ?)",
    tenant.business.id,
    itemId,
    n(form, "to_location_id"),
    Math.abs(qty),
    cost,
    date,
    s(form, "memo") || "Inventory transfer",
  );
  redirect("/inventory/transfers");
}

export async function createProduction(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  const kitId = n(form, "item_id");
  const qty = Number(s(form, "qty") || 1);
  const date = s(form, "date");
  const locationId = n(form, "location_id") || null;
  const components = await db.all<{ item_id: number; qty: number; unit_cost_cents: number }>(
    `SELECT c.item_id, c.qty, i.unit_cost_cents
     FROM item_components c JOIN items i ON i.id = c.item_id
     WHERE c.kit_id = ?`,
    kitId,
  );
  const kit = await db.get<{ name: string; unit_cost_cents: number; inventory_account_id: number | null }>(
    "SELECT name, unit_cost_cents, inventory_account_id FROM items WHERE id = ? AND business_id = ?",
    kitId,
    tenant.business.id,
  );
  if (!kit) throw new Error("Finished item not found.");
  for (const component of components) {
    await db.run(
      "INSERT INTO stock_moves (business_id, item_id, location_id, qty, unit_cost_cents, kind, date, memo) VALUES (?, ?, ?, ?, ?, 'production_consume', ?, ?)",
      tenant.business.id,
      component.item_id,
      locationId,
      -Math.abs(component.qty * qty),
      component.unit_cost_cents,
      date,
      `Production ${kit.name}`,
    );
  }
  await db.run(
    "INSERT INTO stock_moves (business_id, item_id, location_id, qty, unit_cost_cents, kind, date, memo) VALUES (?, ?, ?, ?, ?, 'production', ?, ?)",
    tenant.business.id,
    kitId,
    locationId,
    qty,
    kit.unit_cost_cents,
    date,
    s(form, "memo") || `Produce ${kit.name}`,
  );
  redirect("/inventory/production");
}

export async function addKitComponent(form: FormData) {
  const db = await getDb();
  await db.run(
    "INSERT INTO item_components (kit_id, item_id, qty) VALUES (?, ?, ?)",
    n(form, "kit_id"),
    n(form, "item_id"),
    Number(s(form, "qty") || 1),
  );
  redirect("/inventory/items");
}

export async function applyLateFee(form: FormData) {
  const tenant = await requireTenant();
  const invoiceId = n(form, "invoice_id");
  const fee = parseMoney(s(form, "amount"));
  const invoice = await dbGetInvoice(invoiceId, tenant.business.id);
  const incomeId = await systemAccountId(tenant.business.id, "sales");
  const arId = await systemAccountId(tenant.business.id, "accounts_receivable");
  await postJournal({
    businessId: tenant.business.id,
    date: s(form, "date"),
    memo: `Late fee ${invoice.number}`,
    sourceType: "sales_invoice",
    sourceId: invoiceId,
    lockDate: tenant.business.lock_date,
    lines: [
      { accountId: arId, debitCents: fee, creditCents: 0 },
      { accountId: incomeId, debitCents: 0, creditCents: fee },
    ],
  });
  const db = await getDb();
  await db.run(
    "INSERT INTO invoice_lines (invoice_id, description, qty, unit_cents, income_account_id) VALUES (?, ?, 1, ?, ?)",
    invoiceId,
    s(form, "memo") || "Late payment fee",
    fee,
    incomeId,
  );
  redirect(`/invoices/${invoiceId}`);
}

async function dbGetInvoice(id: number, businessId: number) {
  const db = await getDb();
  const invoice = await db.get<{ id: number; number: string; status: string }>(
    "SELECT id, number, status FROM invoices WHERE id = ? AND business_id = ?",
    id,
    businessId,
  );
  if (!invoice) throw new Error("Invoice not found.");
  return invoice;
}

export async function createWithholding(form: FormData) {
  const tenant = await requireTenant();
  const amount = parseMoney(s(form, "amount"));
  const arId = await systemAccountId(tenant.business.id, "accounts_receivable");
  const expenseId = n(form, "account_id");
  const entryId = await postJournal({
    businessId: tenant.business.id,
    date: s(form, "date"),
    memo: s(form, "memo") || "Withholding tax receipt",
    sourceType: "sales_invoice",
    lockDate: tenant.business.lock_date,
    lines: [
      { accountId: expenseId, debitCents: amount, creditCents: 0 },
      { accountId: arId, debitCents: 0, creditCents: amount },
    ],
  });
  const db = await getDb();
  await db.run(
    "INSERT INTO documents (business_id, kind, number, party_id, date, status, currency, notes, journal_entry_id) VALUES (?, 'withholding', ?, ?, ?, 'posted', ?, ?, ?)",
    tenant.business.id,
    `WHT-${Date.now().toString().slice(-6)}`,
    n(form, "party_id") || null,
    s(form, "date"),
    tenant.business.currency,
    s(form, "memo") || "Withholding tax",
    entryId,
  );
  redirect("/sales/withholding");
}

export async function invoiceTimeEntries(form: FormData) {
  const tenant = await requireTenant();
  const partyId = n(form, "party_id");
  const db = await getDb();
  const entries = await db.all<{ id: number; hours: number; rate_cents: number; memo: string }>(
    "SELECT * FROM time_entries WHERE business_id = ? AND party_id = ? AND invoiced = 0",
    tenant.business.id,
    partyId,
  );
  if (entries.length === 0) throw new Error("No unbilled time for this customer.");
  const income = await systemAccountId(tenant.business.id, "sales");
  const created = await db.run(
    `INSERT INTO documents (business_id, kind, number, party_id, date, status, currency, notes)
     VALUES (?, 'invoice', ?, ?, ?, 'draft', ?, 'Billed time')`,
    tenant.business.id,
    `TIME-${Date.now().toString().slice(-6)}`,
    partyId,
    s(form, "date"),
    tenant.business.currency,
  );
  const id = Number(created.lastInsertRowid);
  for (const entry of entries) {
    await db.run(
      "INSERT INTO document_lines (document_id, description, qty, unit_cents, account_id) VALUES (?, ?, ?, ?, ?)",
      id,
      entry.memo || "Billable time",
      entry.hours,
      entry.rate_cents,
      income,
    );
    await db.run("UPDATE time_entries SET invoiced = 1 WHERE id = ?", entry.id);
  }
  redirect(`/documents/${id}`);
}

export async function invoiceBillableExpenses(form: FormData) {
  const tenant = await requireTenant();
  const partyId = n(form, "party_id");
  const db = await getDb();
  const entries = await db.all<{ id: number; amount_cents: number; memo: string }>(
    "SELECT * FROM billable_expenses WHERE business_id = ? AND party_id = ? AND invoiced = 0",
    tenant.business.id,
    partyId,
  );
  if (entries.length === 0) throw new Error("No unbilled expenses for this customer.");
  const income = await systemAccountId(tenant.business.id, "sales");
  const created = await db.run(
    `INSERT INTO documents (business_id, kind, number, party_id, date, status, currency, notes)
     VALUES (?, 'invoice', ?, ?, ?, 'draft', ?, 'Rebillable expenses')`,
    tenant.business.id,
    `EXP-${Date.now().toString().slice(-6)}`,
    partyId,
    s(form, "date"),
    tenant.business.currency,
  );
  const id = Number(created.lastInsertRowid);
  for (const entry of entries) {
    await db.run(
      "INSERT INTO document_lines (document_id, description, qty, unit_cents, account_id) VALUES (?, ?, 1, ?, ?)",
      id,
      entry.memo || "Billable expense",
      entry.amount_cents,
      income,
    );
    await db.run("UPDATE billable_expenses SET invoiced = 1 WHERE id = ?", entry.id);
  }
  redirect(`/documents/${id}`);
}

export async function applyBankRules() {
  const tenant = await requireTenant();
  const db = await getDb();
  const rules = await db.all<{ id: number; pattern: string; account_id: number; kind: string }>(
    "SELECT * FROM bank_rules WHERE business_id = ?",
    tenant.business.id,
  );
  const lines = await db.all<{
    id: number;
    cash_account_id: number;
    date: string;
    amount_cents: number;
    description: string;
  }>("SELECT * FROM bank_statement_lines WHERE business_id = ? AND matched_move_id IS NULL", tenant.business.id);
  let matched = 0;
  for (const line of lines) {
    const rule = rules.find((item) =>
      item.kind === "contains"
        ? line.description.toLowerCase().includes(item.pattern.toLowerCase())
        : line.description.toLowerCase() === item.pattern.toLowerCase(),
    );
    if (!rule) continue;
    const cash = await db.get<{ account_id: number }>(
      "SELECT account_id FROM cash_accounts WHERE id = ?",
      line.cash_account_id,
    );
    if (!cash) continue;
    const inflow = line.amount_cents >= 0;
    const amount = Math.abs(line.amount_cents);
    const entryId = await postJournal({
      businessId: tenant.business.id,
      date: line.date,
      memo: `Bank rule: ${line.description}`,
      sourceType: inflow ? "cash_receipt" : "cash_payment",
      lockDate: tenant.business.lock_date,
      lines: inflow
        ? [
            { accountId: cash.account_id, debitCents: amount, creditCents: 0 },
            { accountId: rule.account_id, debitCents: 0, creditCents: amount },
          ]
        : [
            { accountId: rule.account_id, debitCents: amount, creditCents: 0 },
            { accountId: cash.account_id, debitCents: 0, creditCents: amount },
          ],
    });
    await db.run(
      "INSERT INTO bank_moves (business_id, kind, cash_account_id, offset_account_id, date, amount_cents, memo, journal_entry_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      tenant.business.id,
      inflow ? "receipt" : "payment",
      line.cash_account_id,
      rule.account_id,
      line.date,
      amount,
      line.description,
      entryId,
    );
    const move = await db.get<{ id: number }>(
      "SELECT id FROM bank_moves WHERE journal_entry_id = ? ORDER BY id DESC",
      entryId,
    );
    await db.run("UPDATE bank_statement_lines SET matched_move_id = ? WHERE id = ?", move?.id ?? entryId, line.id);
    matched += 1;
  }
  redirect("/cash/reconcile");
  return { matched };
}

export async function updateInvestmentPrice(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "UPDATE investments SET market_cents = ? WHERE id = ? AND business_id = ?",
    parseMoney(s(form, "market")),
    n(form, "id"),
    tenant.business.id,
  );
  redirect("/assets/investments");
}

export async function saveSmtp(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "UPDATE businesses SET smtp_json = ? WHERE id = ?",
    JSON.stringify({
      host: s(form, "host"),
      port: s(form, "port"),
      user: s(form, "user"),
      from: s(form, "from"),
    }),
    tenant.business.id,
  );
  redirect("/settings/email");
}

export async function saveWithholdingSettings(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "UPDATE businesses SET withholding_json = ? WHERE id = ?",
    JSON.stringify({ rate: s(form, "rate"), account_id: n(form, "account_id") }),
    tenant.business.id,
  );
  redirect("/settings/tax");
}

export async function createPayslipItemType(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  await db.run(
    "INSERT INTO form_defaults (business_id, entity, defaults_json) VALUES (?, ?, ?)",
    tenant.business.id,
    `payslip_item:${s(form, "name")}`,
    JSON.stringify({ kind: s(form, "kind") || "earning", name: s(form, "name") }),
  );
  redirect("/payroll/items");
}

export async function batchDeleteDocuments(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  const ids = form.getAll("id").map(Number).filter(Boolean);
  for (const id of ids) {
    await db.run("DELETE FROM documents WHERE id = ? AND business_id = ? AND status = 'draft'", id, tenant.business.id);
  }
  redirect("/documents");
}

export async function saveFormDefaults(form: FormData) {
  const tenant = await requireTenant();
  const db = await getDb();
  const entity = s(form, "entity");
  const existing = await db.get<{ id: number }>(
    "SELECT id FROM form_defaults WHERE business_id = ? AND entity = ?",
    tenant.business.id,
    entity,
  );
  const payload = JSON.stringify({ notes: s(form, "notes"), currency: s(form, "currency") });
  if (existing) {
    await db.run("UPDATE form_defaults SET defaults_json = ? WHERE id = ?", payload, existing.id);
  } else {
    await db.run(
      "INSERT INTO form_defaults (business_id, entity, defaults_json) VALUES (?, ?, ?)",
      tenant.business.id,
      entity,
      payload,
    );
  }
  redirect("/settings/defaults");
}
