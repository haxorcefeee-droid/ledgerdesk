import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_MODULES } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "ledgerdesk.db");

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (instance) return instance;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  instance = new DatabaseSync(DB_PATH);
  instance.exec("PRAGMA journal_mode = WAL");
  instance.exec("PRAGMA foreign_keys = ON");
  migrate(instance);
  seedIfEmpty(instance);
  return instance;
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS business (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      fiscal_year_start TEXT NOT NULL DEFAULT '01-01',
      modules_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
      is_system INTEGER NOT NULL DEFAULT 0,
      system_key TEXT UNIQUE,
      archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cash_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      account_id INTEGER NOT NULL UNIQUE REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      memo TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL,
      source_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      debit_cents INTEGER NOT NULL DEFAULT 0,
      credit_cents INTEGER NOT NULL DEFAULT 0,
      memo TEXT NOT NULL DEFAULT '',
      CHECK (debit_cents >= 0 AND credit_cents >= 0),
      CHECK (NOT (debit_cents > 0 AND credit_cents > 0)),
      CHECK (debit_cents + credit_cents > 0)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      date TEXT NOT NULL,
      due_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      journal_entry_id INTEGER REFERENCES journal_entries(id),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted'))
    );

    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      qty REAL NOT NULL DEFAULT 1,
      unit_cents INTEGER NOT NULL,
      income_account_id INTEGER NOT NULL REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      cash_account_id INTEGER NOT NULL REFERENCES cash_accounts(id),
      date TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id)
    );

    CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
  `);
}

function seedIfEmpty(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS n FROM business").get() as { n: number };
  if (row.n > 0) return;

  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO business (id, name, currency, fiscal_year_start, modules_json) VALUES (1, ?, 'USD', '01-01', ?)",
    ).run("North Pine Studio", JSON.stringify(DEFAULT_MODULES));

    const insertAccount = db.prepare(
      "INSERT INTO accounts (code, name, type, is_system, system_key) VALUES (?, ?, ?, ?, ?)",
    );
    insertAccount.run("1000", "Operating bank", "asset", 0, null);
    insertAccount.run("1100", "Accounts receivable", "asset", 1, "accounts_receivable");
    insertAccount.run("3000", "Owner equity", "equity", 0, null);
    insertAccount.run("4000", "Sales", "income", 1, "sales");
    insertAccount.run("5000", "Operating expenses", "expense", 0, null);
    insertAccount.run("5100", "Rent", "expense", 0, null);
    insertAccount.run("5200", "Supplies", "expense", 0, null);

    const bank = db.prepare("SELECT id FROM accounts WHERE code = '1000'").get() as { id: number };
    db.prepare("INSERT INTO cash_accounts (name, account_id) VALUES (?, ?)").run("Operating bank", bank.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
