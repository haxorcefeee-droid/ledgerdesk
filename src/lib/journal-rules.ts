export type DraftLine = {
  accountId: number;
  debitCents: number;
  creditCents: number;
  memo?: string;
};

export function validateJournalLines(lines: DraftLine[]): DraftLine[] {
  const kept = lines.filter((line) => line.debitCents > 0 || line.creditCents > 0);
  if (kept.length < 2) {
    throw new Error("A journal entry needs at least two lines.");
  }
  for (const line of kept) {
    if (line.debitCents < 0 || line.creditCents < 0) {
      throw new Error("Amounts cannot be negative.");
    }
    if (line.debitCents > 0 && line.creditCents > 0) {
      throw new Error("A line cannot be both debit and credit.");
    }
  }
  const debit = kept.reduce((sum, line) => sum + line.debitCents, 0);
  const credit = kept.reduce((sum, line) => sum + line.creditCents, 0);
  if (debit !== credit) {
    throw new Error(`Entry is out of balance. Debits ${debit} cents, credits ${credit} cents.`);
  }
  return kept;
}
