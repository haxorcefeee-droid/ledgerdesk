import { postgresUrl } from "./database-url";
import { DEFAULT_MODULES } from "./modules";
import { migrateV2 } from "./schema-v2";
import { asCount } from "./sql-count";

export type RunResult = { lastInsertRowid: number };

export type DbClient = {
  get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<RunResult>;
  exec(sql: string): Promise<void>;
};

export type Db = DbClient & {
  transaction<T>(fn: (db: DbClient) => Promise<T>): Promise<T>;
};

let instance: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  instance ??= openDb();
  return instance;
}

export function resetDbForTests(): void {
  instance = null;
}

export async function seedBusinessBooks(db: DbClient, businessId: number) {
  const insertAccount =
    "INSERT INTO accounts (code, name, type, is_system, system_key, business_id) VALUES (?, ?, ?, ?, ?, ?)";
  const rows: Array<[string, string, string, number, string | null]> = [
    ["1000", "Operating bank", "asset", 0, null],
    ["1100", "Accounts receivable", "asset", 1, "accounts_receivable"],
    ["1200", "Inventory", "asset", 1, "inventory"],
    ["2000", "Accounts payable", "liability", 1, "accounts_payable"],
    ["2100", "Payroll liabilities", "liability", 1, "payroll_liability"],
    ["3000", "Owner equity", "equity", 0, null],
    ["4000", "Sales", "income", 1, "sales"],
    ["5000", "Operating expenses", "expense", 0, null],
    ["5100", "Rent", "expense", 0, null],
    ["5200", "Supplies", "expense", 0, null],
    ["5300", "COGS", "expense", 1, "cogs"],
    ["5400", "Depreciation", "expense", 1, "depreciation"],
    ["5500", "Wages", "expense", 1, "wages"],
  ];
  for (const [code, name, type, system, key] of rows) {
    const exists = await db.get<{ id: number }>(
      "SELECT id FROM accounts WHERE business_id = ? AND code = ?",
      businessId,
      code,
    );
    if (exists) continue;
    await db.run(insertAccount, code, name, type, system, key, businessId);
  }
  const bank = await db.get<{ id: number }>(
    "SELECT id FROM accounts WHERE business_id = ? AND code = '1000'",
    businessId,
  );
  if (bank) {
    const cash = await db.get<{ id: number }>(
      "SELECT id FROM cash_accounts WHERE business_id = ? AND account_id = ?",
      businessId,
      bank.id,
    );
    if (!cash) {
      await db.run(
        "INSERT INTO cash_accounts (name, account_id, business_id, currency) VALUES (?, ?, ?, 'USD')",
        "Operating bank",
        bank.id,
        businessId,
      );
    }
  }
}

async function openDb(): Promise<Db> {
  const url = postgresUrl();
  if (url) {
    const db = await openPostgres(url);
    await migratePostgres(db);
    await migrateV2(db, "postgres");
    await seedSafely(db);
    await ensureSystemAccounts(db);
    return db;
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL or POSTGRES_URL is required on Vercel.");
  }
  const db = await openSqlite();
  await migrateSqlite(db);
  await migrateV2(db, "sqlite");
  await seedSafely(db);
  await ensureSystemAccounts(db);
  return db;
}

function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url;
  }
}

function toPg(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function coerce(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  return value;
}

function coerceRow<T>(row: Record<string, unknown> | undefined): T | undefined {
  if (!row) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = coerce(value);
  }
  return out as T;
}

type PgQueryable = {
  unsafe: (query: string, params?: never[]) => Promise<unknown[]>;
  begin: (fn: (tx: PgQueryable) => Promise<unknown>) => Promise<unknown>;
};

function makePgClient(sql: PgQueryable): DbClient {
  return {
    async get<T>(text: string, ...params: unknown[]) {
      const rows = await sql.unsafe(toPg(text), params as never[]);
      return coerceRow<T>(rows[0] as Record<string, unknown> | undefined);
    },
    async all<T>(text: string, ...params: unknown[]) {
      const rows = await sql.unsafe(toPg(text), params as never[]);
      return rows.map((row) => coerceRow<T>(row as Record<string, unknown>)!);
    },
    async run(text: string, ...params: unknown[]) {
      let query = text;
      if (/^\s*INSERT/i.test(query) && !/RETURNING/i.test(query)) {
        query = `${query.replace(/;?\s*$/, "")} RETURNING id`;
      }
      const rows = await sql.unsafe(toPg(query), params as never[]);
      const first = rows[0] as { id?: number } | undefined;
      return { lastInsertRowid: first?.id != null ? Number(first.id) : 0 };
    },
    async exec(text: string) {
      await sql.unsafe(text);
    },
  };
}

async function openPostgres(url: string): Promise<Db> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(normalizeDatabaseUrl(url), {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: "require",
  }) as unknown as PgQueryable;
  const client = makePgClient(sql);
  return {
    ...client,
    async transaction<T>(fn: (db: DbClient) => Promise<T>): Promise<T> {
      let result!: T;
      await sql.begin(async (tx) => {
        result = await fn(makePgClient(tx));
      });
      return result;
    },
  };
}

async function openSqlite(): Promise<Db> {
  const { DatabaseSync } = await import("node:sqlite");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const dbPath = process.env.LEDGERDESK_SQLITE_PATH ?? path.join(process.cwd(), "data", "ledgerdesk.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const raw = new DatabaseSync(dbPath);
  raw.exec("PRAGMA journal_mode = WAL");
  raw.exec("PRAGMA foreign_keys = ON");

  const client: DbClient = {
    async get<T>(text: string, ...params: unknown[]) {
      return raw.prepare(text).get(...(params as never[])) as T | undefined;
    },
    async all<T>(text: string, ...params: unknown[]) {
      return raw.prepare(text).all(...(params as never[])) as T[];
    },
    async run(text: string, ...params: unknown[]) {
      const result = raw.prepare(text).run(...(params as never[]));
      return { lastInsertRowid: Number(result.lastInsertRowid) };
    },
    async exec(text: string) {
      raw.exec(text);
    },
  };

  return {
    ...client,
    async transaction(fn) {
      raw.exec("BEGIN");
      try {
        const result = await fn(client);
        raw.exec("COMMIT");
        return result;
      } catch (error) {
        raw.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

const ACCOUNT_TYPE_CHECK = "type IN ('asset','liability','equity','income','expense')";

async function migrateSqlite(db: DbClient) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS business (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      fiscal_year_start TEXT NOT NULL DEFAULT '01-01',
      modules_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (${ACCOUNT_TYPE_CHECK}),
      is_system INTEGER NOT NULL DEFAULT 0,
      system_key TEXT,
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
      number TEXT NOT NULL,
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

async function migratePostgres(db: DbClient) {
  const createdAt = "TEXT NOT NULL DEFAULT to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM-DD HH24:MI:SS')";
  const identity = "INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY";
  const statements = [
    `CREATE TABLE IF NOT EXISTS business (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      fiscal_year_start TEXT NOT NULL DEFAULT '01-01',
      modules_json TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS accounts (
      id ${identity},
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (${ACCOUNT_TYPE_CHECK}),
      is_system INTEGER NOT NULL DEFAULT 0,
      system_key TEXT,
      archived INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS cash_accounts (
      id ${identity},
      name TEXT NOT NULL,
      account_id INTEGER NOT NULL UNIQUE REFERENCES accounts(id)
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id ${identity},
      name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS journal_entries (
      id ${identity},
      date TEXT NOT NULL,
      memo TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL,
      source_id INTEGER,
      created_at ${createdAt}
    )`,
    `CREATE TABLE IF NOT EXISTS journal_lines (
      id ${identity},
      entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      debit_cents INTEGER NOT NULL DEFAULT 0,
      credit_cents INTEGER NOT NULL DEFAULT 0,
      memo TEXT NOT NULL DEFAULT '',
      CHECK (debit_cents >= 0 AND credit_cents >= 0),
      CHECK (NOT (debit_cents > 0 AND credit_cents > 0)),
      CHECK (debit_cents + credit_cents > 0)
    )`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id ${identity},
      number TEXT NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      date TEXT NOT NULL,
      due_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      journal_entry_id INTEGER REFERENCES journal_entries(id),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted'))
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_lines (
      id ${identity},
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      qty DOUBLE PRECISION NOT NULL DEFAULT 1,
      unit_cents INTEGER NOT NULL,
      income_account_id INTEGER NOT NULL REFERENCES accounts(id)
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_payments (
      id ${identity},
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      cash_account_id INTEGER NOT NULL REFERENCES cash_accounts(id),
      date TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      journal_entry_id INTEGER NOT NULL REFERENCES journal_entries(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id)`,
    `CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date)`,
  ];
  for (const statement of statements) {
    await db.exec(statement);
  }
}

async function seedSafely(db: Db) {
  try {
    await seedIfEmpty(db);
  } catch (err) {
    console.error("[ledgerdesk] seedIfEmpty failed", err);
  }
}

async function adoptExistingBooks(
  db: DbClient,
  legacy?: {
    name?: string;
    currency?: string;
    fiscal_year_start?: string;
    modules_json?: string;
  },
) {
  const name = legacy?.name || "My Business";
  const currency = legacy?.currency || "USD";
  const fiscalYearStart = legacy?.fiscal_year_start || "01-01";
  let modules = DEFAULT_MODULES;
  try {
    modules = { ...DEFAULT_MODULES, ...(legacy?.modules_json ? JSON.parse(legacy.modules_json) : {}) };
  } catch {
    modules = DEFAULT_MODULES;
  }
  await db.run(
    "INSERT INTO businesses (id, name, currency, fiscal_year_start, modules_json) VALUES (?, ?, ?, ?, ?)",
    1,
    name,
    currency,
    fiscalYearStart,
    JSON.stringify(modules),
  );
  await db.exec("UPDATE accounts SET business_id = 1 WHERE business_id IS NULL");
  await db.exec("UPDATE cash_accounts SET business_id = 1 WHERE business_id IS NULL");
  await db.exec("UPDATE journal_entries SET business_id = 1 WHERE business_id IS NULL");
  await db.exec("UPDATE customers SET business_id = 1 WHERE business_id IS NULL");
  await db.exec("UPDATE invoices SET business_id = 1 WHERE business_id IS NULL");
}

async function seedIfEmpty(db: Db) {
  const existing = await db.get<{ id: number }>("SELECT id FROM businesses LIMIT 1");
  if (existing) return;

  const legacy = await db.get<{
    name: string;
    currency: string;
    fiscal_year_start: string;
    modules_json: string;
  }>("SELECT name, currency, fiscal_year_start, modules_json FROM business WHERE id = 1");
  const accountCount = asCount(await db.get<{ n: unknown }>("SELECT COUNT(*) AS n FROM accounts"));
  if (legacy || accountCount > 0) {
    await adoptExistingBooks(db, legacy ?? undefined);
    return;
  }

  await db.transaction(async (tx) => {
    await tx.run(
      "INSERT INTO businesses (id, name, currency, fiscal_year_start, modules_json) VALUES (?, ?, 'USD', '01-01', ?)",
      1,
      "North Pine Studio",
      JSON.stringify(DEFAULT_MODULES),
    );
    const legacyCount = asCount(await tx.get<{ n: unknown }>("SELECT COUNT(*) AS n FROM business"));
    if (legacyCount === 0) {
      await tx.run(
        "INSERT INTO business (id, name, currency, fiscal_year_start, modules_json) VALUES (?, ?, 'USD', '01-01', ?)",
        1,
        "North Pine Studio",
        JSON.stringify(DEFAULT_MODULES),
      );
    }

    const insertAccount =
      "INSERT INTO accounts (code, name, type, is_system, system_key, business_id) VALUES (?, ?, ?, ?, ?, 1)";
    await tx.run(insertAccount, "1000", "Operating bank", "asset", 0, null);
    await tx.run(insertAccount, "1100", "Accounts receivable", "asset", 1, "accounts_receivable");
    await tx.run(insertAccount, "1200", "Inventory", "asset", 1, "inventory");
    await tx.run(insertAccount, "2000", "Accounts payable", "liability", 1, "accounts_payable");
    await tx.run(insertAccount, "2100", "Payroll liabilities", "liability", 1, "payroll_liability");
    await tx.run(insertAccount, "3000", "Owner equity", "equity", 0, null);
    await tx.run(insertAccount, "4000", "Sales", "income", 1, "sales");
    await tx.run(insertAccount, "5000", "Operating expenses", "expense", 0, null);
    await tx.run(insertAccount, "5100", "Rent", "expense", 0, null);
    await tx.run(insertAccount, "5200", "Supplies", "expense", 0, null);
    await tx.run(insertAccount, "5300", "COGS", "expense", 1, "cogs");
    await tx.run(insertAccount, "5400", "Depreciation", "expense", 1, "depreciation");
    await tx.run(insertAccount, "5500", "Wages", "expense", 1, "wages");

    const bank = await tx.get<{ id: number }>("SELECT id FROM accounts WHERE code = ? AND business_id = 1", "1000");
    if (!bank) throw new Error("Failed to seed operating bank.");
    await tx.run(
      "INSERT INTO cash_accounts (name, account_id, business_id, currency) VALUES (?, ?, 1, 'USD')",
      "Operating bank",
      bank.id,
    );
    await tx.run("INSERT INTO locations (business_id, name) VALUES (1, ?)", "Main warehouse");
    await tx.run("INSERT INTO divisions (business_id, name, code) VALUES (1, ?, ?)", "General", "GEN");
    await tx.run(
      "INSERT INTO tax_codes (business_id, code, name, rate_bps, inclusive) VALUES (1, ?, ?, ?, 0)",
      "TAX",
      "Standard tax",
      0,
    );
  });
}

const SYSTEM_ACCOUNTS: Array<[string, string, string, string]> = [
  ["1100", "Accounts receivable", "asset", "accounts_receivable"],
  ["1200", "Inventory", "asset", "inventory"],
  ["2000", "Accounts payable", "liability", "accounts_payable"],
  ["2100", "Payroll liabilities", "liability", "payroll_liability"],
  ["4000", "Sales", "income", "sales"],
  ["5300", "COGS", "expense", "cogs"],
  ["5400", "Depreciation", "expense", "depreciation"],
  ["5500", "Wages", "expense", "wages"],
];

async function ensureSystemAccounts(db: Db) {
  const businesses = await db.all<{ id: number }>("SELECT id FROM businesses");
  for (const business of businesses) {
    for (const [code, name, type, key] of SYSTEM_ACCOUNTS) {
      const found = await db.get<{ id: number }>(
        "SELECT id FROM accounts WHERE business_id = ? AND system_key = ?",
        business.id,
        key,
      );
      if (found) continue;
      const byCode = await db.get<{ id: number }>(
        "SELECT id FROM accounts WHERE business_id = ? AND code = ?",
        business.id,
        code,
      );
      if (byCode) {
        await db.run("UPDATE accounts SET system_key = ?, is_system = 1 WHERE id = ?", key, byCode.id);
        continue;
      }
      try {
        await db.run(
          "INSERT INTO accounts (code, name, type, is_system, system_key, business_id) VALUES (?, ?, ?, 1, ?, ?)",
          code,
          name,
          type,
          key,
          business.id,
        );
      } catch {
        // unique code already present for this business
      }
    }
  }
}
