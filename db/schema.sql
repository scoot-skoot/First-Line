-- db/schema.sql  (idempotent for db:reset: drop + create)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS session_warning_signs, scores, debriefs, turns, sessions,
  caller_relationships, scenario_warning_signs, warning_signs, scenarios, personas, trainees CASCADE;

CREATE TABLE trainees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  text NOT NULL,
  leaderboard_opt_in boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE personas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text UNIQUE NOT NULL,
  name              text NOT NULL,
  age               smallint,
  voice_id          text,
  backstory         text NOT NULL,
  speaking_style    text NOT NULL,
  baseline_emotion  text NOT NULL,
  is_recurring      boolean NOT NULL DEFAULT false,
  content_notes     text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE scenarios (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id          uuid NOT NULL REFERENCES personas(id),
  title               text NOT NULL,
  call_number         smallint NOT NULL DEFAULT 1,
  difficulty_tier     smallint NOT NULL CHECK (difficulty_tier BETWEEN 1 AND 4),
  situation_brief     text NOT NULL,
  hidden_state        text NOT NULL,
  expected_risk_level text NOT NULL CHECK (expected_risk_level IN ('low','moderate','high')),
  initial_distress    smallint NOT NULL DEFAULT 60 CHECK (initial_distress BETWEEN 0 AND 100),
  is_active           boolean NOT NULL DEFAULT true
);

CREATE TABLE warning_signs (
  id            smallserial PRIMARY KEY,
  code          text UNIQUE NOT NULL,
  label         text NOT NULL,
  fcp_category  text NOT NULL CHECK (fcp_category IN ('desire','intent','capability','buffers'))
);

CREATE TABLE scenario_warning_signs (
  scenario_id      uuid REFERENCES scenarios(id) ON DELETE CASCADE,
  warning_sign_id  smallint REFERENCES warning_signs(id),
  cue_hint         text NOT NULL,
  PRIMARY KEY (scenario_id, warning_sign_id)
);

CREATE TABLE caller_relationships (
  trainee_id              uuid REFERENCES trainees(id),
  persona_id              uuid REFERENCES personas(id),
  backboard_assistant_id  text,
  calls_completed         smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (trainee_id, persona_id)
);

CREATE TABLE sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id         uuid NOT NULL REFERENCES trainees(id),
  scenario_id        uuid NOT NULL REFERENCES scenarios(id),
  persona_id         uuid NOT NULL REFERENCES personas(id),
  mode               text NOT NULL CHECK (mode IN ('text','voice')),
  status             text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  started_at         timestamptz NOT NULL DEFAULT now(),
  ended_at           timestamptz,
  overall_score      smallint CHECK (overall_score BETWEEN 0 AND 100),
  parent_session_id  uuid REFERENCES sessions(id),
  branched_from_seq  int
);
CREATE INDEX sessions_trainee_ended_idx ON sessions (trainee_id, ended_at);

CREATE TABLE turns (
  id                      bigserial PRIMARY KEY,
  session_id              uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seq                     int NOT NULL,
  speaker                 text NOT NULL CHECK (speaker IN ('trainee','caller')),
  text                    text NOT NULL,
  distress                smallint CHECK (distress BETWEEN 0 AND 100),
  trust                   smallint CHECK (trust BETWEEN 0 AND 100),
  emotion                 text,
  revealed_warning_signs  text[] NOT NULL DEFAULT '{}',
  state                   jsonb,
  latency_ms              int,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, seq)
);

CREATE TABLE debriefs (
  session_id  uuid PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  summary     text NOT NULL,
  strengths   jsonb NOT NULL,
  next_steps  jsonb NOT NULL,
  asked_directly_about_suicide boolean NOT NULL,
  model       text NOT NULL,
  raw_json    jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scores (
  session_id         uuid REFERENCES sessions(id) ON DELETE CASCADE,
  skill              text CHECK (skill IN ('active_listening','empathy','de_escalation','risk_assessment','warning_sign_recognition')),
  score              smallint NOT NULL CHECK (score BETWEEN 0 AND 4),
  evidence           text,
  evidence_turn_seq  int,
  PRIMARY KEY (session_id, skill)
);

CREATE TABLE session_warning_signs (
  session_id         uuid REFERENCES sessions(id) ON DELETE CASCADE,
  warning_sign_id    smallint REFERENCES warning_signs(id),
  status             text NOT NULL CHECK (status IN ('caught','partial','missed')),
  surfaced_turn_seq  int,
  response_turn_seq  int,
  PRIMARY KEY (session_id, warning_sign_id)
);
