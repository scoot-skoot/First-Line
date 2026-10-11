import { readdirSync, readFileSync } from "node:fs";
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

const dbRoot = join(__dirname, "../../db");
const schema = readFileSync(join(dbRoot, "schema.sql"), "utf8");
const seed = readFileSync(join(dbRoot, "seed.sql"), "utf8");
const migrationsDir = join(dbRoot, "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

try {
  await pool.query(schema);
  await pool.query(seed);
  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await pool.query(sql);
    console.log(`db:reset applied migration ${file}`);
  }
  console.log("db:reset OK — schema + seed + migrations applied");
} catch (err) {
  console.error("FAIL db:reset", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
