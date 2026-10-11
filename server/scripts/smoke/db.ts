import pg from "pg";
import "../../src/config.js";
import { pgPoolConfig } from "../../src/db/pgConnection.js";
import { formatError, printResult, timed } from "./_util.js";

async function main(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    printResult("db", false, "missing env DATABASE_URL", 0);
    return false;
  }
  const pool = new pg.Pool(pgPoolConfig(url));
  try {
    const { value: note, ms } = await timed(async () => {
      await pool.query("SELECT 1");
      const tables = await pool.query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = 'sessions'
         ) AS present`,
      );
      const present = Boolean(tables.rows[0]?.present);
      return present ? "sessions table present" : "sessions table not yet created (ok before M1)";
    });
    printResult("db", true, note, ms);
    return true;
  } catch (err) {
    printResult("db", false, formatError(err), 0);
    return false;
  } finally {
    await pool.end();
  }
}

const ok = await main();
process.exit(ok ? 0 : 1);
