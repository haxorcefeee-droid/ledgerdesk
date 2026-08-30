export function parseMoney(input: string): number {
  const cleaned = input.replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    throw new Error("Amount must be a number.");
  }
  return Math.round(value * 100);
}

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
