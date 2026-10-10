import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import "../src/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL missing env DATABASE_URL");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes("localhost") ? undefined : { rejectUnauthorized: false },
});

const schema = readFileSync(join(__dirname, "../../db/schema.sql"), "utf8");
const seed = readFileSync(join(__dirname, "../../db/seed.sql"), "utf8");

await pool.query(schema);
await pool.query(seed);
console.log("db:reset OK — schema + seed applied");
await pool.end();
