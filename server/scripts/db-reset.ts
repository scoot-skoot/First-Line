import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "../src/config.js";
import {
  isPlaceholderDatabaseUrl,
  pgPoolConfig,
} from "../src/db/pgConnection.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL missing env DATABASE_URL");
  process.exit(1);
}
if (isPlaceholderDatabaseUrl(url)) {
  console.error(
    "FAIL DATABASE_URL still looks like the .env.example placeholder (user:password@host).",
  );
  console.error(
    "Set DATABASE_URL to your real Postgres URL (e.g. Tiger Cloud), then re-run db:reset.",
  );
  process.exit(1);
}

const pool = new pg.Pool(pgPoolConfig(url));

const schema = readFileSync(join(__dirname, "../../db/schema.sql"), "utf8");
const seed = readFileSync(join(__dirname, "../../db/seed.sql"), "utf8");

try {
  await pool.query(schema);
  await pool.query(seed);
  console.log("db:reset OK — schema + seed applied");
} catch (err) {
  console.error("FAIL db:reset", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
