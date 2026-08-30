import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateJournalLines } from "../src/lib/journal-rules.ts";

describe("journal posting", () => {
  it("rejects fewer than two lines", () => {
    assert.throws(
      () => validateJournalLines([{ accountId: 1, debitCents: 100, creditCents: 0 }]),
      /at least two lines/,
    );
  });

  it("rejects unbalanced entries", () => {
    assert.throws(
      () =>
        validateJournalLines([
          { accountId: 1, debitCents: 100, creditCents: 0 },
          { accountId: 2, debitCents: 0, creditCents: 50 },
        ]),
      /out of balance/,
    );
  });
});
