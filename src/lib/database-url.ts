const URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "NEON_DATABASE_URL",
] as const;

export function postgresUrl(): string | undefined {
  for (const key of URL_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function hasPostgresUrl(): boolean {
  return Boolean(postgresUrl());
}
