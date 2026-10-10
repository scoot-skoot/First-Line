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
  Skill,
  Trainee,
  TurnRecord,
} from "../../../shared/types/index.js";
import { RAY_DEMO_MEMORIES, SEED, WARNING_SIGNS } from "../seedData.js";
import { computeOverallScore } from "../services/scoring.js";
import type {
  CreatePlayableScenarioInput,
  LocalMemoryFact,
  Repository,
  ScoreHistoryRow,
  WarningSignHistoryRow,
} from "./types.js";
import { DEMO_TRAINEE, PERSONAS, SCENARIOS } from "./seedEntities.js";

type Rel = { backboardAssistantId: string | null; callsCompleted: number };

function toSummary(s: Scenario, p: Persona): ScenarioSummary {
  return {
    id: s.id,
    title: s.title,
    personaName: p.name,
    personaAge: p.age,
    difficultyTier: s.difficultyTier,
    contentNotes: p.contentNotes,
    initialDistress: s.initialDistress,
    expectedRiskLevel: s.expectedRiskLevel,
    callNumber: s.callNumber,
    personaVoiceId: p.voiceId,
    isCallback: s.callNumber > 1,
  };
}

function toDebriefView(
  output: ScoringOutput,
  overall: number,
  turns: TurnRecord[],
): DebriefView {
  return {
    skills: output.skills,
    warningSigns: output.warning_signs,
    askedDirectlyAboutSuicide: output.asked_directly_about_suicide,
    summary: output.summary,
    strengths: output.strengths,
    nextSteps: output.next_steps,
    overallScore: overall,
    distressCurve: turns
      .filter((t) => t.speaker === "caller" && t.distress != null)
      .map((t) => ({ seq: t.seq, distress: t.distress! })),
  };
}

/** Seed a few completed sessions so readiness works in mock mode. */
function seedPracticeHistory(
  sessions: Map<string, SessionRecord>,
  turns: Map<string, TurnRecord[]>,
  debriefs: Map<string, DebriefView>,
  scoreRows: ScoreHistoryRow[],
  warningRows: WarningSignHistoryRow[],
): void {
  const skills: Skill[] = [
    "active_listening",
    "empathy",
    "de_escalation",
    "risk_assessment",
    "warning_sign_recognition",
  ];
  const samples: {
    id: string;
    scenarioId: string;
    overall: number;
    scores: number[];
    daysAgo: number;
    missed: string[];
  }[] = [
    {
      id: "d0000000-0000-4000-8000-000000000001",
      scenarioId: SEED.scenarios.maya,
      overall: 62,
      scores: [3, 3, 2, 2, 2],
      daysAgo: 5,
      missed: ["hopelessness"],
    },
    {
      id: "d0000000-0000-4000-8000-000000000002",
      scenarioId: SEED.scenarios.ray,
      overall: 58,
      scores: [2, 2, 2, 3, 1],
      daysAgo: 3,
      missed: ["perceived_burden", "withdrawal"],
    },
    {
      id: "d0000000-0000-4000-8000-000000000003",
      scenarioId: SEED.scenarios.ray2,
      overall: 71,
      scores: [3, 3, 3, 3, 2],
      daysAgo: 1,
      missed: ["withdrawal"],
    },
  ];

  for (const sample of samples) {
    const scenario = SCENARIOS.find((s) => s.id === sample.scenarioId)!;
    const persona = PERSONAS.find((p) => p.id === scenario.personaId)!;
    const ended = new Date(Date.now() - sample.daysAgo * 86400000);
    const started = new Date(ended.getTime() - 15 * 60000);
    const session: SessionRecord = {
      id: sample.id,
      traineeId: SEED.traineeId,
      scenarioId: scenario.id,
      personaId: persona.id,
      mode: "text",
      status: "completed",
      startedAt: started.toISOString(),
      endedAt: ended.toISOString(),
      overallScore: sample.overall,
    };
    sessions.set(session.id, session);

    const turnList: TurnRecord[] = [
      {
        id: randomUUID(),
        sessionId: session.id,
        seq: 1,
        speaker: "caller",
        text: "Hey... thanks for picking up.",
        distress: scenario.initialDistress,
        trust: 30,
        emotion: "flat",
        revealedWarningSigns: [],
        state: null,
        latencyMs: 100,
        createdAt: started.toISOString(),
      },
      {
        id: randomUUID(),
        sessionId: session.id,
        seq: 2,
        speaker: "trainee",
        text: "I'm glad you called. What's been going on?",
        distress: null,
        trust: null,
        emotion: null,
        revealedWarningSigns: [],
        state: null,
        latencyMs: null,
        createdAt: new Date(started.getTime() + 60000).toISOString(),
      },
      {
        id: randomUUID(),
        sessionId: session.id,
        seq: 3,
        speaker: "caller",
        text: "I don't know... it just feels heavy.",
        distress: Math.max(20, scenario.initialDistress - 8),
        trust: 40,
        emotion: "anxious",
        revealedWarningSigns: sample.missed.slice(0, 1),
        state: null,
        latencyMs: 200,
        createdAt: new Date(started.getTime() + 120000).toISOString(),
      },
    ];
    turns.set(session.id, turnList);

    const output: ScoringOutput = {
      skills: skills.map((skill, i) => ({
        skill,
        score: sample.scores[i]!,
        evidence_quote: "Practice evidence from seeded session.",
        evidence_turn_seq: 2,
        rationale: "Seeded for readiness demo.",
      })),
      warning_signs: sample.missed.map((code) => ({
        code,
        status: "missed" as const,
        surfaced_turn_seq: 3,
        response_turn_seq: null,
        explanation: "Seeded miss for readiness trends.",
      })),
      asked_directly_about_suicide: sample.overall >= 65,
      summary: "Seeded practice session for readiness reporting.",
      strengths: ["Stayed present with the caller"],
      next_steps: ["Ask more directly about safety when cues appear"],
    };
    debriefs.set(session.id, toDebriefView(output, sample.overall, turnList));

    for (let i = 0; i < skills.length; i++) {
      scoreRows.push({
        sessionId: session.id,
        endedAt: ended.toISOString(),
        overallScore: sample.overall,
        skill: skills[i]!,
        score: sample.scores[i]!,
        scenarioTitle: scenario.title,
        personaName: persona.name,
      });
    }
    for (const code of sample.missed) {
      const meta = WARNING_SIGNS.find((w) => w.code === code);
      warningRows.push({
        code,
        label: meta?.label ?? code,
        fcpCategory: meta?.fcp ?? "desire",
        status: "missed",
        sessionId: session.id,
      });
    }
  }
}

export class MemoryRepository implements Repository {
  private trainees = new Map<string, Trainee>([[DEMO_TRAINEE.id, { ...DEMO_TRAINEE }]]);
  private personas = new Map(PERSONAS.map((p) => [p.id, { ...p }]));
  private scenarios = new Map(SCENARIOS.map((s) => [s.id, { ...s }]));
  private sessions = new Map<string, SessionRecord>();
  private turns = new Map<string, TurnRecord[]>();
  private debriefs = new Map<string, DebriefView>();
  private relationships = new Map<string, Rel>();
  private localMemories = new Map<string, LocalMemoryFact[]>();
  private scoreHistory: ScoreHistoryRow[] = [];
  private warningHistory: WarningSignHistoryRow[] = [];

  constructor() {
    // Seed Ray demo memories for reliable call #3 path
    const rayKey = this.relKey(SEED.traineeId, SEED.personas.ray);
    this.relationships.set(rayKey, {
      backboardAssistantId: null,
      callsCompleted: 2,
    });
    this.localMemories.set(
      rayKey,
      RAY_DEMO_MEMORIES.map((content) => ({
        content,
        source: "seed",
        sessionId: null,
        createdAt: new Date().toISOString(),
      })),
    );
    seedPracticeHistory(
      this.sessions,
      this.turns,
      this.debriefs,
      this.scoreHistory,
      this.warningHistory,
    );
  }

  private relKey(traineeId: string, personaId: string) {
    return `${traineeId}::${personaId}`;
  }

  async listScenarios(): Promise<ScenarioSummary[]> {
    return [...this.scenarios.values()]
      .filter((s) => s.isActive)
      .sort((a, b) => a.difficultyTier - b.difficultyTier || a.callNumber - b.callNumber)
      .map((s) => toSummary(s, this.personas.get(s.personaId)!));
  }

  async getScenarioWithPersona(
    scenarioId: string,
  ): Promise<{ scenario: Scenario; persona: Persona }> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) throw new Error("SCENARIO_NOT_FOUND");
    const persona = this.personas.get(scenario.personaId);
    if (!persona) throw new Error("PERSONA_NOT_FOUND");
    return { scenario, persona };
  }

  async listTrainees(): Promise<Trainee[]> {
    return [...this.trainees.values()];
  }

  async getTrainee(id: string): Promise<Trainee | null> {
    return this.trainees.get(id) ?? null;
  }

  async createSession(s: NewSession): Promise<SessionRecord> {
    const record: SessionRecord = {
      id: randomUUID(),
      traineeId: s.traineeId,
      scenarioId: s.scenarioId,
      personaId: s.personaId,
      mode: s.mode,
      status: "in_progress",
      startedAt: new Date().toISOString(),
      endedAt: null,
      overallScore: null,
    };
    this.sessions.set(record.id, record);
    this.turns.set(record.id, []);
    return record;
  }

  async getSession(id: string): Promise<SessionDetail | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    return {
      session,
      turns: [...(this.turns.get(id) ?? [])],
      debrief: this.debriefs.get(id) ?? null,
    };
  }

  async appendTurn(t: NewTurn): Promise<TurnRecord> {
    const list = this.turns.get(t.sessionId);
    if (!list) throw new Error("SESSION_NOT_FOUND");
    const seq = list.length + 1;
    const record: TurnRecord = {
      id: randomUUID(),
      sessionId: t.sessionId,
      seq,
      speaker: t.speaker,
      text: t.text,
      distress: t.distress ?? null,
      trust: t.trust ?? null,
      emotion: (t.emotion as Emotion | null | undefined) ?? null,
      revealedWarningSigns: t.revealedWarningSigns ?? [],
      state: t.state ?? null,
      latencyMs: t.latencyMs ?? null,
      createdAt: new Date().toISOString(),
    };
    list.push(record);
    return record;
  }

  async completeSession(
    id: string,
    debrief: ScoringOutput,
    overall: number,
  ): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) throw new Error("SESSION_NOT_FOUND");
    session.status = "completed";
    session.endedAt = new Date().toISOString();
    session.overallScore = overall;
    const turns = this.turns.get(id) ?? [];
    this.debriefs.set(id, toDebriefView(debrief, overall || computeOverallScore(debrief), turns));

    const scenario = this.scenarios.get(session.scenarioId);
    const persona = this.personas.get(session.personaId);
    for (const s of debrief.skills) {
      this.scoreHistory.push({
        sessionId: id,
        endedAt: session.endedAt!,
        overallScore: overall,
        skill: s.skill,
        score: s.score,
        scenarioTitle: scenario?.title ?? "Unknown",
        personaName: persona?.name ?? "Unknown",
      });
    }
    for (const w of debrief.warning_signs) {
      const meta = WARNING_SIGNS.find((x) => x.code === w.code);
      this.warningHistory.push({
        code: w.code,
        label: meta?.label ?? w.code,
        fcpCategory: meta?.fcp ?? "desire",
        status: w.status,
        sessionId: id,
      });
    }
  }

  async listSessionsForTrainee(traineeId: string): Promise<SessionSummary[]> {
    const out: SessionSummary[] = [];
    for (const s of this.sessions.values()) {
      if (s.traineeId !== traineeId) continue;
      const scenario = this.scenarios.get(s.scenarioId);
      const persona = this.personas.get(s.personaId);
      out.push({
        id: s.id,
        scenarioTitle: scenario?.title ?? "Unknown",
        personaName: persona?.name ?? "Unknown",
        status: s.status,
        overallScore: s.overallScore,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
      });
    }
    return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async getCallerRelationship(
    traineeId: string,
    personaId: string,
  ): Promise<Rel | null> {
    return this.relationships.get(this.relKey(traineeId, personaId)) ?? null;
  }

  async upsertCallerRelationship(
    traineeId: string,
    personaId: string,
    patch: { backboardAssistantId?: string; callsCompleted?: number },
  ): Promise<void> {
    const key = this.relKey(traineeId, personaId);
    const prev = this.relationships.get(key) ?? {
      backboardAssistantId: null,
      callsCompleted: 0,
    };
    this.relationships.set(key, {
      backboardAssistantId:
        patch.backboardAssistantId ?? prev.backboardAssistantId,
      callsCompleted: patch.callsCompleted ?? prev.callsCompleted,
    });
  }

  async listLocalMemories(
    traineeId: string,
    personaId: string,
  ): Promise<LocalMemoryFact[]> {
    return [...(this.localMemories.get(this.relKey(traineeId, personaId)) ?? [])];
  }

  async appendLocalMemories(
    traineeId: string,
    personaId: string,
    facts: string[],
    source = "session",
    sessionId: string | null = null,
  ): Promise<void> {
    const key = this.relKey(traineeId, personaId);
    const list = this.localMemories.get(key) ?? [];
    for (const content of facts) {
      if (!content.trim()) continue;
      list.push({
        content: content.trim(),
        source,
        sessionId,
        createdAt: new Date().toISOString(),
      });
    }
    this.localMemories.set(key, list);
  }

  async createPlayableScenario(
    input: CreatePlayableScenarioInput,
  ): Promise<{ scenario: Scenario; persona: Persona; summary: ScenarioSummary }> {
    const persona: Persona = {
      id: randomUUID(),
      ...input.persona,
    };
    const scenario: Scenario = {
      id: randomUUID(),
      personaId: persona.id,
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
    this.personas.set(persona.id, persona);
    this.scenarios.set(scenario.id, scenario);
    return { scenario, persona, summary: toSummary(scenario, persona) };
  }

  async listScoreHistory(traineeId: string): Promise<ScoreHistoryRow[]> {
    return this.scoreHistory.filter((r) => {
      const s = this.sessions.get(r.sessionId);
      return s?.traineeId === traineeId;
    });
  }

  async listWarningSignHistory(traineeId: string): Promise<WarningSignHistoryRow[]> {
    return this.warningHistory.filter((r) => {
      const s = this.sessions.get(r.sessionId);
      return s?.traineeId === traineeId;
    });
  }

  async listDistressPointsForTrainee(
    traineeId: string,
    limit = 40,
  ): Promise<{ sessionId: string; seq: number; distress: number; at: string }[]> {
    const out: { sessionId: string; seq: number; distress: number; at: string }[] = [];
    for (const s of this.sessions.values()) {
      if (s.traineeId !== traineeId || s.status !== "completed") continue;
      for (const t of this.turns.get(s.id) ?? []) {
        if (t.speaker === "caller" && t.distress != null) {
          out.push({
            sessionId: s.id,
            seq: t.seq,
            distress: t.distress,
            at: t.createdAt,
          });
        }
      }
    }
    return out.sort((a, b) => a.at.localeCompare(b.at)).slice(-limit);
  }
}
