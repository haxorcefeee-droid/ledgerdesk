import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("sqlite journal", () => {
  it("posts a balanced entry and balances the trial", () => {
    const dir = mkdtempSync(join(tmpdir(), "ledgerdesk-"));
    const db = new DatabaseSync(join(dir, "t.db"));
    db.exec(`
      CREATE TABLE accounts (id INTEGER PRIMARY KEY, code TEXT, type TEXT);
      CREATE TABLE journal_entries (id INTEGER PRIMARY KEY, date TEXT);
      CREATE TABLE journal_lines (
        id INTEGER PRIMARY KEY,
        entry_id INTEGER,
        account_id INTEGER,
        debit_cents INTEGER,
        credit_cents INTEGER
      );
      INSERT INTO accounts (id, code, type) VALUES (1, '1000', 'asset'), (2, '3000', 'equity');
    `);
    db.exec("BEGIN");
    const entry = db.prepare("INSERT INTO journal_entries (date) VALUES ('2026-01-01')").run();
    const id = Number(entry.lastInsertRowid);
    const line = db.prepare(
      "INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents) VALUES (?, ?, ?, ?)",
    );
    line.run(id, 1, 5000, 0);
    line.run(id, 2, 0, 5000);
    db.exec("COMMIT");
    const sums = db
      .prepare("SELECT SUM(debit_cents) AS d, SUM(credit_cents) AS c FROM journal_lines")
      .get();
    assert.equal(sums.d, sums.c);
    assert.equal(sums.d, 5000);
    db.close();
  });
});
