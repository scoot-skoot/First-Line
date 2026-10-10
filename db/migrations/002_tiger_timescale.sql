-- Tiger Data / TimescaleDB add-ons for First Line readiness analytics.
-- Safe to run on plain Postgres: Timescale bits are wrapped in DO blocks and
-- skipped when the extension is unavailable.
--
-- Docs verified (Tiger Data):
--   create_hypertable: https://www.tigerdata.com/docs/reference/timescaledb/hypertables/create_hypertable
--   continuous aggregates: https://www.tigerdata.com/docs/docs/build/continuous-aggregates/create-a-continuous-aggregate
--   time_bucket used in continuous aggregate SELECT/GROUP BY

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Append-only turn events for distress curves (hypertable when Timescale present).
CREATE TABLE IF NOT EXISTS turn_events (
  time         timestamptz NOT NULL DEFAULT now(),
  session_id   uuid NOT NULL,
  trainee_id   uuid NOT NULL,
  seq          int NOT NULL,
  speaker      text NOT NULL CHECK (speaker IN ('trainee', 'caller')),
  distress     smallint CHECK (distress BETWEEN 0 AND 100),
  trust        smallint CHECK (trust BETWEEN 0 AND 100),
  emotion      text
);

CREATE INDEX IF NOT EXISTS turn_events_trainee_time_idx
  ON turn_events (trainee_id, time DESC);

CREATE INDEX IF NOT EXISTS turn_events_session_seq_idx
  ON turn_events (session_id, seq);

-- Attempt Timescale hypertable + continuous aggregate. No-op on plain Postgres.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;

  -- Generalized API (TimescaleDB >= 2.13): create_hypertable(relation, by_range(...))
  PERFORM create_hypertable(
    'turn_events',
    by_range('time'),
    if_not_exists => TRUE,
    migrate_data => TRUE
  );

  -- Daily per-trainee progress continuous aggregate
  IF NOT EXISTS (
    SELECT 1 FROM timescaledb_information.continuous_aggregates
    WHERE view_name = 'trainee_daily_progress'
  ) THEN
    EXECUTE $cagg$
      CREATE MATERIALIZED VIEW trainee_daily_progress
      WITH (timescaledb.continuous) AS
      SELECT
        time_bucket(INTERVAL '1 day', time) AS bucket,
        trainee_id,
        COUNT(*) FILTER (WHERE speaker = 'caller') AS caller_turns,
        AVG(distress) FILTER (WHERE speaker = 'caller') AS avg_distress,
        MAX(distress) FILTER (WHERE speaker = 'caller') AS peak_distress,
        MIN(distress) FILTER (WHERE speaker = 'caller') AS min_distress
      FROM turn_events
      GROUP BY bucket, trainee_id
      WITH NO DATA
    $cagg$;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB features skipped (plain Postgres or unsupported): %', SQLERRM;
END
$$;

-- Example distress-curve query using time_bucket when available, else date_trunc.
-- Used by readiness analytics / demo notebooks; app falls back to repository methods.
--
-- Timescale:
--   SELECT time_bucket('5 minutes', time) AS bucket, AVG(distress)
--   FROM turn_events WHERE trainee_id = $1 AND speaker = 'caller'
--   GROUP BY bucket ORDER BY bucket;
--
-- Plain Postgres:
--   SELECT date_trunc('minute', created_at) AS bucket, AVG(distress)
--   FROM turns t JOIN sessions s ON s.id = t.session_id
--   WHERE s.trainee_id = $1 AND t.speaker = 'caller'
--   GROUP BY bucket ORDER BY bucket;
