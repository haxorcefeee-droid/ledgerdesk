export function postgresUrl(): string | undefined {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.NEON_DATABASE_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
  ];
  return candidates.map((value) => value?.trim()).find(Boolean);
}

export function hasPostgresUrl(): boolean {
  return Boolean(postgresUrl());
}
