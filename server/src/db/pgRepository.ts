import { randomUUID } from "node:crypto";
import type {
  DebriefView,
  Emotion,
  NewSession,
  NewTurn,
  Persona,
  Scenario,
  ScenarioSummary,
  ScoringOutput,
  SessionDetail,
  SessionRecord,
  SessionSummary,
  Trainee,
  TurnRecord,
} from "../../../shared/types/index.js";
import { getPool } from "./pool.js";
import type {
  CreatePlayableScenarioInput,
  LocalMemoryFact,
  Repository,
  ScoreHistoryRow,
  WarningSignHistoryRow,
} from "./types.js";

function mapSession(r: Record<string, unknown>): SessionRecord {
  return {
    id: String(r.id),
    traineeId: String(r.trainee_id),
    scenarioId: String(r.scenario_id),
    personaId: String(r.persona_id),
    mode: r.mode as SessionRecord["mode"],
    status: r.status as SessionRecord["status"],
    startedAt: new Date(String(r.started_at)).toISOString(),
    endedAt: r.ended_at ? new Date(String(r.ended_at)).toISOString() : null,
    overallScore: r.overall_score == null ? null : Number(r.overall_score),
  };
}

function mapTurn(r: Record<string, unknown>): TurnRecord {
  return {
    id: String(r.id),
    sessionId: String(r.session_id),
    seq: Number(r.seq),
    speaker: r.speaker as TurnRecord["speaker"],
    text: String(r.text),
    distress: r.distress == null ? null : Number(r.distress),
    trust: r.trust == null ? null : Number(r.trust),
    emotion: (r.emotion as Emotion | null) ?? null,
    revealedWarningSigns: (r.revealed_warning_signs as string[]) ?? [],
    state: (r.state as Record<string, unknown> | null) ?? null,
    latencyMs: r.latency_ms == null ? null : Number(r.latency_ms),
    createdAt: new Date(String(r.created_at)).toISOString(),
  };
}

function mapDebrief(
  raw: ScoringOutput,
  overall: number,
  turns: TurnRecord[],
): DebriefView {
  return {
    skills: raw.skills,
    warningSigns: raw.warning_signs,
    askedDirectlyAboutSuicide: raw.asked_directly_about_suicide,
    summary: raw.summary,
    strengths: raw.strengths,
    nextSteps: raw.next_steps,
    overallScore: overall,
    distressCurve: turns
      .filter((t) => t.speaker === "caller" && t.distress != null)
      .map((t) => ({ seq: t.seq, distress: t.distress! })),
  };
}

export class PgRepository implements Repository {
  async listScenarios(): Promise<ScenarioSummary[]> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.difficulty_tier, s.initial_distress, s.expected_risk_level,
              s.call_number, p.name AS persona_name, p.age AS persona_age, p.content_notes,
              p.voice_id AS persona_voice_id
       FROM scenarios s
       JOIN personas p ON p.id = s.persona_id
       WHERE s.is_active = true
       ORDER BY s.difficulty_tier, s.call_number, s.title`,
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      personaName: r.persona_name,
      personaAge: r.persona_age,
      difficultyTier: r.difficulty_tier,
      contentNotes: r.content_notes ?? [],
      initialDistress: r.initial_distress,
      expectedRiskLevel: r.expected_risk_level,
      callNumber: r.call_number,
      personaVoiceId: r.persona_voice_id,
      isCallback: Number(r.call_number) > 1,
    }));
  }

  async getScenarioWithPersona(
    scenarioId: string,
  ): Promise<{ scenario: Scenario; persona: Persona }> {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT s.*, p.id AS p_id, p.slug, p.name AS p_name, p.age, p.voice_id,
              p.backstory, p.speaking_style, p.baseline_emotion, p.is_recurring, p.content_notes
       FROM scenarios s
       JOIN personas p ON p.id = s.persona_id
       WHERE s.id = $1`,
      [scenarioId],
    );
    if (!rows[0]) throw new Error("SCENARIO_NOT_FOUND");
    const r = rows[0];
    const ws = await pool.query(
      `SELECT ws.code, sws.cue_hint
       FROM scenario_warning_signs sws
       JOIN warning_signs ws ON ws.id = sws.warning_sign_id
       WHERE sws.scenario_id = $1`,
      [scenarioId],
    );
    const warningSignCodes = ws.rows.map((x) => x.code as string);
    const warningSignHints: Record<string, string> = {};
    for (const x of ws.rows) warningSignHints[x.code] = x.cue_hint;

    return {
      scenario: {
        id: r.id,
        personaId: r.persona_id,
        title: r.title,
        callNumber: r.call_number,
        difficultyTier: r.difficulty_tier,
        situationBrief: r.situation_brief,
        hiddenState: r.hidden_state,
        expectedRiskLevel: r.expected_risk_level,
        initialDistress: r.initial_distress,
        isActive: r.is_active,
        warningSignCodes,
        warningSignHints,
      },
      persona: {
        id: r.p_id,
        slug: r.slug,
        name: r.p_name,
        age: r.age,
        voiceId: r.voice_id,
        backstory: r.backstory,
        speakingStyle: r.speaking_style,
        baselineEmotion: r.baseline_emotion,
        isRecurring: r.is_recurring,
        contentNotes: r.content_notes ?? [],
      },
    };
  }

  async listTrainees(): Promise<Trainee[]> {
    const { rows } = await getPool().query(
      `SELECT id, display_name, leaderboard_opt_in FROM trainees ORDER BY display_name`,
    );
    return rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      leaderboardOptIn: r.leaderboard_opt_in,
    }));
  }

  async getTrainee(id: string): Promise<Trainee | null> {
    const { rows } = await getPool().query(
      `SELECT id, display_name, leaderboard_opt_in FROM trainees WHERE id = $1`,
      [id],
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      displayName: rows[0].display_name,
      leaderboardOptIn: rows[0].leaderboard_opt_in,
    };
  }

  async createSession(s: NewSession): Promise<SessionRecord> {
    const { rows } = await getPool().query(
      `INSERT INTO sessions (trainee_id, scenario_id, persona_id, mode)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [s.traineeId, s.scenarioId, s.personaId, s.mode],
    );
    return mapSession(rows[0]);
  }

  async getSession(id: string): Promise<SessionDetail | null> {
    const pool = getPool();
    const sess = await pool.query(`SELECT * FROM sessions WHERE id = $1`, [id]);
    if (!sess.rows[0]) return null;
    const turns = await pool.query(
      `SELECT * FROM turns WHERE session_id = $1 ORDER BY seq`,
      [id],
    );
    const turnRecords = turns.rows.map(mapTurn);
    const deb = await pool.query(`SELECT * FROM debriefs WHERE session_id = $1`, [id]);
    let debrief: DebriefView | null = null;
    if (deb.rows[0]) {
      const raw = deb.rows[0].raw_json as ScoringOutput;
      debrief = mapDebrief(raw, Number(sess.rows[0].overall_score ?? 0), turnRecords);
    }
    return { session: mapSession(sess.rows[0]), turns: turnRecords, debrief };
  }

  async appendTurn(t: NewTurn): Promise<TurnRecord> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const seqRes = await client.query(
        `SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM turns WHERE session_id = $1`,
        [t.sessionId],
      );
      const seq = Number(seqRes.rows[0].next_seq);
      const { rows } = await client.query(
        `INSERT INTO turns
          (session_id, seq, speaker, text, distress, trust, emotion, revealed_warning_signs, state, latency_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          t.sessionId,
          seq,
          t.speaker,
          t.text,
          t.distress ?? null,
          t.trust ?? null,
          t.emotion ?? null,
          t.revealedWarningSigns ?? [],
          t.state ? JSON.stringify(t.state) : null,
          t.latencyMs ?? null,
        ],
      );
      await client.query("COMMIT");
      return mapTurn(rows[0]);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async completeSession(
    id: string,
    debrief: ScoringOutput,
    overall: number,
  ): Promise<void> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE sessions SET status = 'completed', ended_at = now(), overall_score = $2 WHERE id = $1`,
        [id, overall],
      );
      await client.query(
        `INSERT INTO debriefs (session_id, summary, strengths, next_steps, asked_directly_about_suicide, model, raw_json)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (session_id) DO NOTHING`,
        [
          id,
          debrief.summary,
          JSON.stringify(debrief.strengths),
          JSON.stringify(debrief.next_steps),
          debrief.asked_directly_about_suicide,
          "gemini",
          JSON.stringify(debrief),
        ],
      );
      for (const s of debrief.skills) {
        await client.query(
          `INSERT INTO scores (session_id, skill, score, evidence, evidence_turn_seq)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (session_id, skill) DO NOTHING`,
          [id, s.skill, s.score, s.evidence_quote, s.evidence_turn_seq],
        );
      }
      for (const w of debrief.warning_signs) {
        const ws = await client.query(`SELECT id FROM warning_signs WHERE code = $1`, [
          w.code,
        ]);
        if (!ws.rows[0]) continue;
        await client.query(
          `INSERT INTO session_warning_signs (session_id, warning_sign_id, status, surfaced_turn_seq, response_turn_seq)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (session_id, warning_sign_id) DO NOTHING`,
          [id, ws.rows[0].id, w.status, w.surfaced_turn_seq, w.response_turn_seq],
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async listSessionsForTrainee(traineeId: string): Promise<SessionSummary[]> {
    const { rows } = await getPool().query(
      `SELECT s.id, s.status, s.overall_score, s.started_at, s.ended_at,
              sc.title AS scenario_title, p.name AS persona_name
       FROM sessions s
       JOIN scenarios sc ON sc.id = s.scenario_id
       JOIN personas p ON p.id = s.persona_id
       WHERE s.trainee_id = $1
       ORDER BY s.started_at DESC`,
      [traineeId],
    );
    return rows.map((r) => ({
      id: r.id,
      scenarioTitle: r.scenario_title,
      personaName: r.persona_name,
      status: r.status,
      overallScore: r.overall_score,
      startedAt: new Date(r.started_at).toISOString(),
      endedAt: r.ended_at ? new Date(r.ended_at).toISOString() : null,
    }));
  }

  async getCallerRelationship(traineeId: string, personaId: string) {
    const { rows } = await getPool().query(
      `SELECT backboard_assistant_id, calls_completed
       FROM caller_relationships WHERE trainee_id = $1 AND persona_id = $2`,
      [traineeId, personaId],
    );
    if (!rows[0]) return null;
    return {
      backboardAssistantId: rows[0].backboard_assistant_id as string | null,
      callsCompleted: Number(rows[0].calls_completed),
    };
  }

  async upsertCallerRelationship(
    traineeId: string,
    personaId: string,
    patch: { backboardAssistantId?: string; callsCompleted?: number },
  ): Promise<void> {
    // IMPORTANT: never INSERT NULL into calls_completed — Postgres DEFAULT only
    // applies when the column is omitted, not when an explicit NULL is bound.
    const callsCompleted =
      patch.callsCompleted !== undefined && patch.callsCompleted !== null
        ? patch.callsCompleted
        : 0;
    await getPool().query(
      `INSERT INTO caller_relationships (trainee_id, persona_id, backboard_assistant_id, calls_completed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (trainee_id, persona_id) DO UPDATE SET
         backboard_assistant_id = COALESCE(EXCLUDED.backboard_assistant_id, caller_relationships.backboard_assistant_id),
         calls_completed = CASE
           WHEN $5::boolean THEN EXCLUDED.calls_completed
           ELSE caller_relationships.calls_completed
         END`,
      [
        traineeId,
        personaId,
        patch.backboardAssistantId ?? null,
        callsCompleted,
        patch.callsCompleted !== undefined && patch.callsCompleted !== null,
      ],
    );
  }

  async listLocalMemories(
    traineeId: string,
    personaId: string,
  ): Promise<LocalMemoryFact[]> {
    const { rows } = await getPool().query(
      `SELECT content, source, session_id, created_at
       FROM caller_memory_facts
       WHERE trainee_id = $1 AND persona_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [traineeId, personaId],
    );
    return rows.map((r) => ({
      content: String(r.content),
      source: String(r.source),
      sessionId: r.session_id ? String(r.session_id) : null,
      createdAt: new Date(String(r.created_at)).toISOString(),
    }));
  }

  async appendLocalMemories(
    traineeId: string,
    personaId: string,
    facts: string[],
    source = "session",
    sessionId: string | null = null,
  ): Promise<void> {
    const pool = getPool();
    for (const content of facts) {
      if (!content.trim()) continue;
      await pool.query(
        `INSERT INTO caller_memory_facts (trainee_id, persona_id, content, source, session_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [traineeId, personaId, content.trim(), source, sessionId],
      );
    }
  }

  async createPlayableScenario(
    input: CreatePlayableScenarioInput,
  ): Promise<{ scenario: Scenario; persona: Persona; summary: ScenarioSummary }> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const personaId = randomUUID();
      const scenarioId = randomUUID();
      await client.query(
        `INSERT INTO personas
          (id, slug, name, age, voice_id, backstory, speaking_style, baseline_emotion, is_recurring, content_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          personaId,
          input.persona.slug,
          input.persona.name,
          input.persona.age,
          input.persona.voiceId,
          input.persona.backstory,
          input.persona.speakingStyle,
          input.persona.baselineEmotion,
          input.persona.isRecurring,
          input.persona.contentNotes,
        ],
      );
      await client.query(
        `INSERT INTO scenarios
          (id, persona_id, title, call_number, difficulty_tier, situation_brief, hidden_state,
           expected_risk_level, initial_distress, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
        [
          scenarioId,
          personaId,
          input.scenario.title,
          input.scenario.callNumber,
          input.scenario.difficultyTier,
          input.scenario.situationBrief,
          input.scenario.hiddenState,
          input.scenario.expectedRiskLevel,
          input.scenario.initialDistress,
        ],
      );
      for (const code of input.scenario.warningSignCodes) {
        const ws = await client.query(`SELECT id FROM warning_signs WHERE code = $1`, [
          code,
        ]);
        if (!ws.rows[0]) continue;
        await client.query(
          `INSERT INTO scenario_warning_signs (scenario_id, warning_sign_id, cue_hint)
           VALUES ($1,$2,$3)`,
          [
            scenarioId,
            ws.rows[0].id,
            input.scenario.warningSignHints[code] ?? `Hints at ${code}`,
          ],
        );
      }
      await client.query("COMMIT");

      const persona: Persona = { id: personaId, ...input.persona };
      const scenario: Scenario = {
        id: scenarioId,
        personaId,
        title: input.scenario.title,
        callNumber: input.scenario.callNumber,
        difficultyTier: input.scenario.difficultyTier,
        situationBrief: input.scenario.situationBrief,
        hiddenState: input.scenario.hiddenState,
        expectedRiskLevel: input.scenario.expectedRiskLevel,
        initialDistress: input.scenario.initialDistress,
        isActive: true,
        warningSignCodes: input.scenario.warningSignCodes,
        warningSignHints: input.scenario.warningSignHints,
      };
      return {
        scenario,
        persona,
        summary: {
          id: scenario.id,
          title: scenario.title,
          personaName: persona.name,
          personaAge: persona.age,
          difficultyTier: scenario.difficultyTier,
          contentNotes: persona.contentNotes,
          initialDistress: scenario.initialDistress,
          expectedRiskLevel: scenario.expectedRiskLevel,
          callNumber: scenario.callNumber,
          personaVoiceId: persona.voiceId,
          isCallback: false,
        },
      };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async listScoreHistory(traineeId: string): Promise<ScoreHistoryRow[]> {
    const { rows } = await getPool().query(
      `SELECT s.id AS session_id, s.ended_at, s.overall_score,
              sc.skill, sc.score, scn.title AS scenario_title, p.name AS persona_name
       FROM sessions s
       JOIN scores sc ON sc.session_id = s.id
       JOIN scenarios scn ON scn.id = s.scenario_id
       JOIN personas p ON p.id = s.persona_id
       WHERE s.trainee_id = $1 AND s.status = 'completed' AND s.ended_at IS NOT NULL
       ORDER BY s.ended_at ASC`,
      [traineeId],
    );
    return rows.map((r) => ({
      sessionId: String(r.session_id),
      endedAt: new Date(String(r.ended_at)).toISOString(),
      overallScore: r.overall_score == null ? null : Number(r.overall_score),
      skill: r.skill,
      score: Number(r.score),
      scenarioTitle: String(r.scenario_title),
      personaName: String(r.persona_name),
    }));
  }

  async listWarningSignHistory(traineeId: string): Promise<WarningSignHistoryRow[]> {
    const { rows } = await getPool().query(
      `SELECT ws.code, ws.label, ws.fcp_category, sws.status, s.id AS session_id
       FROM session_warning_signs sws
       JOIN warning_signs ws ON ws.id = sws.warning_sign_id
       JOIN sessions s ON s.id = sws.session_id
       WHERE s.trainee_id = $1 AND s.status = 'completed'`,
      [traineeId],
    );
    return rows.map((r) => ({
      code: String(r.code),
      label: String(r.label),
      fcpCategory: String(r.fcp_category),
      status: r.status,
      sessionId: String(r.session_id),
    }));
  }

  async listDistressPointsForTrainee(
    traineeId: string,
    limit = 40,
  ): Promise<{ sessionId: string; seq: number; distress: number; at: string }[]> {
    const { rows } = await getPool().query(
      `SELECT t.session_id, t.seq, t.distress, t.created_at
       FROM turns t
       JOIN sessions s ON s.id = t.session_id
       WHERE s.trainee_id = $1
         AND s.status = 'completed'
         AND t.speaker = 'caller'
         AND t.distress IS NOT NULL
       ORDER BY t.created_at DESC
       LIMIT $2`,
      [traineeId, limit],
    );
    return rows
      .map((r) => ({
        sessionId: String(r.session_id),
        seq: Number(r.seq),
        distress: Number(r.distress),
        at: new Date(String(r.created_at)).toISOString(),
      }))
      .reverse();
  }
}
