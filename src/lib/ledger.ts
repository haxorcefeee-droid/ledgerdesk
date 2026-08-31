import { getDb } from "./db";
import { assertBusinessScopedIds } from "./business-scope";
import { validateJournalLines, type DraftLine } from "./journal-rules";
import type { JournalSource } from "./types";

export type { DraftLine };

export async function postJournal(input: {
  businessId: number;
  date: string;
  memo: string;
  sourceType: JournalSource | string;
  sourceId?: number | null;
  reference?: string;
  divisionId?: number | null;
  projectId?: number | null;
  lockDate?: string | null;
  lines: DraftLine[];
}): Promise<number> {
  if (input.lockDate && input.date <= input.lockDate) {
    throw new Error(`Period is locked on or before ${input.lockDate}.`);
  }
  const lines = validateJournalLines(input.lines);
  const accountIds = [...new Set(lines.map((line) => line.accountId).filter((id) => Number.isFinite(id) && id > 0))];
  if (accountIds.length > 0) {
    const db = await getDb();
    const accountRows = await db.all<{ id: number; business_id: number }>(
      "SELECT id, business_id FROM accounts WHERE id IN (" + accountIds.map(() => "?").join(", ") + ")",
      ...accountIds,
    );
    assertBusinessScopedIds(input.businessId, accountRows, "journal account");
    if (accountRows.length !== accountIds.length) {
      throw new Error("One or more journal accounts are invalid for this business.");
    }
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    const result = await tx.run(
      "INSERT INTO journal_entries (date, memo, source_type, source_id, business_id, division_id, project_id, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      input.date,
      input.memo,
      input.sourceType,
      input.sourceId ?? null,
      input.businessId,
      input.divisionId ?? null,
      input.projectId ?? null,
      input.reference ?? "",
    );
    const entryId = Number(result.lastInsertRowid);
    for (const line of lines) {
      await tx.run(
        "INSERT INTO journal_lines (entry_id, account_id, debit_cents, credit_cents, memo, division_id, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        entryId,
        line.accountId,
        line.debitCents,
        line.creditCents,
        line.memo ?? "",
        input.divisionId ?? null,
        line.projectId ?? input.projectId ?? null,
      );
    }
    return entryId;
  });
}

export async function accountBalanceCents(accountId: number, asOf?: string): Promise<number> {
  const db = await getDb();
  const account = await db.get<{ type: string; business_id: number }>(
    "SELECT type, business_id FROM accounts WHERE id = ?",
    accountId,
  );
  if (!account) throw new Error("Account not found.");
  const row = asOf
    ? await db.get<{ debit: number; credit: number }>(
        `SELECT COALESCE(SUM(l.debit_cents), 0) AS debit, COALESCE(SUM(l.credit_cents), 0) AS credit
             FROM journal_lines l
             JOIN journal_entries e ON e.id = l.entry_id
             WHERE l.account_id = ? AND e.business_id = ? AND e.date <= ?`,
        accountId,
        account.business_id,
        asOf,
      )
    : await db.get<{ debit: number; credit: number }>(
        `SELECT COALESCE(SUM(l.debit_cents), 0) AS debit, COALESCE(SUM(l.credit_cents), 0) AS credit
             FROM journal_lines l
             JOIN journal_entries e ON e.id = l.entry_id
             WHERE l.account_id = ? AND e.business_id = ?`,
        accountId,
        account.business_id,
      );
  const debit = Number(row?.debit ?? 0);
  const credit = Number(row?.credit ?? 0);
  if (account.type === "asset" || account.type === "expense") return debit - credit;
  return credit - debit;
}

export async function systemAccountId(businessId: number, key: string): Promise<number> {
  const db = await getDb();
  const row = await db.get<{ id: number }>(
    "SELECT id FROM accounts WHERE business_id = ? AND system_key = ?",
    businessId,
    key,
  );
  if (!row) throw new Error(`System account "${key}" is missing.`);
  return row.id;
}
