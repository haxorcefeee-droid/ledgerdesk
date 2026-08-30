export function asCount(row?: { n?: unknown } | null): number {
  const value = Number(row?.n ?? 0);
  return Number.isFinite(value) ? value : 0;
}
