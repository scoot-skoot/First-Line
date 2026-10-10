import pg from "pg";
import { config } from "../config.js";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL required for postgres repository");
  }
  if (!pool) {
    // VERIFY: hosted Postgres SSL — Neon/Supabase usually need sslmode=require in URL
    // or ssl: { rejectUnauthorized: false }
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}
