import { getDb } from "./db";
import { validateJournalLines, type DraftLine } from "./journal-rules";
import type { JournalSource } from "./types";

export type { DraftLine };

export function postJournal(input: {
  date: string;
  memo: string;
  sourceType: JournalSource;
  sourceId?: number | null;
  lines: DraftLine[];
}): number {
  const lines = validateJournalLines(input.lines);

  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = db
      .prepare(
        "INSERT INTO journal_entries (date, memo, source_type, source_id) VALUES (?, ?, ?, ?)",
      )
      .run(input.date, input.memo, input.sourceType, input.sourceId ?? null);
    const entryId = Number(result.lastInsertRowid);
    const insertLine = db.prepare(
      "INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents, memo) VALUES (?, ?, ?, ?, ?)",
    );
    for (const line of lines) {
      insertLine.run(entryId, line.accountId, line.debitCents, line.creditCents, line.memo ?? "");
    }
    db.exec("COMMIT");
    return entryId;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function accountBalanceCents(accountId: number, asOf?: string): number {
  const db = getDb();
  const account = db.prepare("SELECT type FROM accounts WHERE id = ?").get(accountId) as
    | { type: string }
    | undefined;
  if (!account) throw new Error("Account not found.");

  const row = (
    asOf
      ? db
          .prepare(
            `SELECT COALESCE(SUM(l.debit_cents), 0) AS debit, COALESCE(SUM(l.credit_cents), 0) AS credit
             FROM journal_lines l
             JOIN journal_entries e ON e.id = l.entry_id
             WHERE l.account_id = ? AND e.date <= ?`,
          )
          .get(accountId, asOf)
      : db
          .prepare(
            `SELECT COALESCE(SUM(debit_cents), 0) AS debit, COALESCE(SUM(credit_cents), 0) AS credit
             FROM journal_lines WHERE account_id = ?`,
          )
          .get(accountId)
  ) as { debit: number; credit: number };

  if (account.type === "asset" || account.type === "expense") {
    return row.debit - row.credit;
  }
  return row.credit - row.debit;
}

export function systemAccountId(key: string): number {
  const row = getDb()
    .prepare("SELECT id FROM accounts WHERE system_key = ?")
    .get(key) as { id: number } | undefined;
  if (!row) throw new Error(`System account "${key}" is missing.`);
  return row.id;
}
