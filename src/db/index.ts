import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// Pool construction is lazy about opening connections. Missing configuration is
// reported by initialization/health, not at import time during a Vercel build.
export const pool = globalForDb.__arenaNextJsPostgresqlPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 15_000,
  max: 5,
});
globalForDb.__arenaNextJsPostgresqlPool = pool;
export const db = drizzle(pool);
