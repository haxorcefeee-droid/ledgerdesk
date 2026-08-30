import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("production v1 to v2 migrate", () => {
  it("adopts the legacy business row instead of reseeding", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ledgerdesk-prod-"));
    const dbPath = join(dir, "t.db");
    process.env.LEDGERDESK_SQLITE_PATH = dbPath;
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;

    const { DatabaseSync } = await import("node:sqlite");
    const raw = new DatabaseSync(dbPath);
    raw.exec(`
      CREATE TABLE business (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        fiscal_year_start TEXT NOT NULL DEFAULT '01-01',
        modules_json TEXT NOT NULL
      );
      CREATE TABLE accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        is_system INTEGER NOT NULL DEFAULT 0,
        system_key TEXT,
        archived INTEGER NOT NULL DEFAULT 0
      );
    `);
    raw.prepare(
      "INSERT INTO business (id, name, currency, fiscal_year_start, modules_json) VALUES (1, ?, 'USD', '01-01', '{}')",
    ).run("Acme Co");
    raw.prepare(
      "INSERT INTO accounts (code, name, type, is_system, system_key) VALUES (?, ?, ?, 1, ?)",
    ).run("1100", "Accounts receivable", "asset", "accounts_receivable");
    raw.prepare("INSERT INTO accounts (code, name, type, is_system) VALUES (?, ?, ?, 0)").run(
      "1000",
      "Operating bank",
      "asset",
    );
    raw.close();

    const { resetDbForTests, getDb } = await import("../src/lib/db.ts");
    resetDbForTests();
    const db = await getDb();
    const business = await db.get<{ name: string }>("SELECT name FROM businesses WHERE id = 1");
    assert.equal(business?.name, "Acme Co");
    const ar = await db.get<{ name: string }>("SELECT name FROM accounts WHERE code = '1100'");
    assert.equal(ar?.name, "Accounts receivable");
    const seeded = await db.get<{ name: string }>("SELECT name FROM businesses WHERE name = 'North Pine Studio'");
    assert.equal(seeded, undefined);
    resetDbForTests();
  });
});
