/**
 * Tiger Data / Timescale helpers for readiness distress curves.
 * Prefer time_bucket on turn_events hypertable; fall back to plain Postgres turns.
 *
 * Syntax verified against Tiger Data docs (create_hypertable + continuous aggregates
 * + time_bucket). See db/migrations/002_tiger_timescale.sql.
 */
import type { Pool } from "pg";

export interface DistressBucketRow {
  bucket: string;
  avgDistress: number;
  peakDistress: number;
  n: number;
}

async function hasTimescale(pool: Pool): Promise<boolean> {
  try {
    const r = await pool.query(
      `SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'`,
    );
    return r.rowCount !== null && r.rowCount > 0;
  } catch {
    return false;
  }
}

async function hasTurnEvents(pool: Pool): Promise<boolean> {
  try {
    const r = await pool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'turn_events'`,
    );
    return r.rowCount !== null && r.rowCount > 0;
  } catch {
    return false;
  }
}

/** Session distress curve buckets for one trainee (last `days` days). */
export async function traineeDistressBuckets(
  pool: Pool,
  traineeId: string,
  days = 14,
): Promise<DistressBucketRow[]> {
  const useTiger = (await hasTimescale(pool)) && (await hasTurnEvents(pool));

  if (useTiger) {
    try {
      const { rows } = await pool.query(
        `SELECT time_bucket(INTERVAL '1 hour', time) AS bucket,
                AVG(distress)::float AS avg_distress,
                MAX(distress)::float AS peak_distress,
                COUNT(*)::int AS n
         FROM turn_events
         WHERE trainee_id = $1
           AND speaker = 'caller'
           AND distress IS NOT NULL
           AND time >= now() - make_interval(days => $2)
         GROUP BY bucket
         ORDER BY bucket`,
        [traineeId, days],
      );
      return rows.map((r) => ({
        bucket: new Date(String(r.bucket)).toISOString(),
        avgDistress: Number(r.avg_distress),
        peakDistress: Number(r.peak_distress),
        n: Number(r.n),
      }));
    } catch (err) {
      console.warn(
        "[tigerQueries] time_bucket query failed; falling back:",
        (err as Error).message,
      );
    }
  }

  // Plain Postgres fallback using turns + sessions
  const { rows } = await pool.query(
    `SELECT date_trunc('hour', t.created_at) AS bucket,
            AVG(t.distress)::float AS avg_distress,
            MAX(t.distress)::float AS peak_distress,
            COUNT(*)::int AS n
     FROM turns t
     JOIN sessions s ON s.id = t.session_id
     WHERE s.trainee_id = $1
       AND t.speaker = 'caller'
       AND t.distress IS NOT NULL
       AND t.created_at >= now() - make_interval(days => $2)
     GROUP BY bucket
     ORDER BY bucket`,
    [traineeId, days],
  );
  return rows.map((r) => ({
    bucket: new Date(String(r.bucket)).toISOString(),
    avgDistress: Number(r.avg_distress),
    peakDistress: Number(r.peak_distress),
    n: Number(r.n),
  }));
}

/** Read continuous aggregate when present; else empty (caller uses readiness service). */
export async function traineeDailyProgressFromCagg(
  pool: Pool,
  traineeId: string,
  days = 14,
): Promise<{ bucket: string; avgDistress: number | null; callerTurns: number }[]> {
  try {
    const { rows } = await pool.query(
      `SELECT bucket, avg_distress, caller_turns
       FROM trainee_daily_progress
       WHERE trainee_id = $1
         AND bucket >= now() - make_interval(days => $2)
       ORDER BY bucket`,
      [traineeId, days],
    );
    return rows.map((r) => ({
      bucket: new Date(String(r.bucket)).toISOString(),
      avgDistress: r.avg_distress == null ? null : Number(r.avg_distress),
      callerTurns: Number(r.caller_turns ?? 0),
    }));
  } catch {
    return [];
  }
}
