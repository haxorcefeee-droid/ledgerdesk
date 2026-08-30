export function asPlain<T extends object>(row: T): T {
  return { ...row };
}

export function asPlainList<T extends object>(rows: T[]): T[] {
  return rows.map((row) => asPlain(row));
}
