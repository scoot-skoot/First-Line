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
import { computeOverallScore } from "../services/scoring.js";
import type { Repository } from "./types.js";
import { DEMO_TRAINEE, PERSONAS, SCENARIOS } from "./seedEntities.js";

type Rel = { backboardAssistantId: string | null; callsCompleted: number };

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

export class MemoryRepository implements Repository {
  private trainees = new Map<string, Trainee>([[DEMO_TRAINEE.id, { ...DEMO_TRAINEE }]]);
  private personas = new Map(PERSONAS.map((p) => [p.id, p]));
  private scenarios = new Map(SCENARIOS.map((s) => [s.id, s]));
  private sessions = new Map<string, SessionRecord>();
  private turns = new Map<string, TurnRecord[]>();
  private debriefs = new Map<string, DebriefView>();
  private relationships = new Map<string, Rel>();

  private relKey(traineeId: string, personaId: string) {
    return `${traineeId}::${personaId}`;
  }

  async listScenarios(): Promise<ScenarioSummary[]> {
    return SCENARIOS.filter((s) => s.isActive && s.callNumber === 1).map((s) => {
      const p = this.personas.get(s.personaId)!;
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
      };
    });
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
}
