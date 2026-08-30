export function asPlain<T extends object>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = typeof value === "bigint" ? Number(value) : value;
  }
  return out as T;
}

export function asPlainList<T extends object>(rows: T[]): T[] {
  return rows.map((row) => asPlain(row));
}
