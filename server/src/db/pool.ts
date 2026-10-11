import pg from "pg";
import { config } from "../config.js";
import { pgPoolConfig } from "./pgConnection.js";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL required for postgres repository");
  }
  if (!pool) {
    pool = new pg.Pool(pgPoolConfig(config.databaseUrl));
  }
  return pool;
}
