export function assertBusinessScopedRows<T extends { id: number; business_id?: number | null }>(
  businessId: number,
  rows: T[],
  label: string,
) {
  const invalid = rows.filter((row) => row.business_id !== businessId);
  if (invalid.length > 0) {
    throw new Error(`${label} does not belong to this business.`);
  }
}

export function assertBusinessScopedIds<T extends { id: number; business_id?: number | null }>(
  businessId: number,
  rows: T[],
  label: string,
) {
  const invalid = rows.filter((row) => row.business_id !== businessId);
  if (invalid.length > 0) {
    throw new Error(`${label} does not belong to this business.`);
  }
}
