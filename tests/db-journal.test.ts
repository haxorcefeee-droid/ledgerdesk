import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

describe("db journal adapter", () => {
  it("seeds a business and posts a balanced entry", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ledgerdesk-"));
    process.env.LEDGERDESK_SQLITE_PATH = join(dir, "t.db");
    delete process.env.DATABASE_URL;

    const { resetDbForTests, getDb } = await import("../src/lib/db.ts");
    const { postJournal, accountBalanceCents } = await import("../src/lib/ledger.ts");
    const { getBusiness } = await import("../src/lib/queries.ts");
    const { trialBalance } = await import("../src/lib/reports.ts");
    resetDbForTests();

    const business = await getBusiness();
    assert.equal(business.name, "North Pine Studio");

    const db = await getDb();
    const bank = await db.get<{ id: number }>("SELECT id FROM accounts WHERE code = ?", "1000");
    const equity = await db.get<{ id: number }>("SELECT id FROM accounts WHERE code = ?", "3000");
    assert.ok(bank && equity);

    await postJournal({
      date: "2026-01-15",
      memo: "Owner contribution",
      sourceType: "manual",
      lines: [
        { accountId: bank.id, debitCents: 10000, creditCents: 0 },
        { accountId: equity.id, debitCents: 0, creditCents: 10000 },
      ],
    });

    assert.equal(await accountBalanceCents(bank.id), 10000);
    const trial = await trialBalance("2026-01-31");
    const debit = trial.reduce((sum, row) => sum + row.debitCents, 0);
    const credit = trial.reduce((sum, row) => sum + row.creditCents, 0);
    assert.equal(debit, credit);
    resetDbForTests();
  });
});
