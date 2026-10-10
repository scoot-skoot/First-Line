import type {
  DebriefView,
  GeneratedPersona,
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

export interface Repository {
  listScenarios(): Promise<ScenarioSummary[]>;
  getScenarioWithPersona(
    scenarioId: string,
  ): Promise<{ scenario: Scenario; persona: Persona }>;
  listTrainees(): Promise<Trainee[]>;
  createSession(s: NewSession): Promise<SessionRecord>;
  getSession(id: string): Promise<SessionDetail | null>;
  appendTurn(t: NewTurn): Promise<TurnRecord>;
  completeSession(id: string, debrief: ScoringOutput, overall: number): Promise<void>;
  listSessionsForTrainee(traineeId: string): Promise<SessionSummary[]>;
  getCallerRelationship(
    traineeId: string,
    personaId: string,
  ): Promise<{ backboardAssistantId: string | null; callsCompleted: number } | null>;
  upsertCallerRelationship(
    traineeId: string,
    personaId: string,
    patch: { backboardAssistantId?: string; callsCompleted?: number },
  ): Promise<void>;
  /** Caller-POV facts reconstructed from prior completed sessions (memory fallback). */
  recallSessionMemories(traineeId: string, personaId: string): Promise<string[]>;
  /** Persist a Build-a-Caller scenario; returns new scenario id. */
  createGeneratedScenario(persona: GeneratedPersona): Promise<string>;
  /** Skill score rows for readiness trends. */
  listSkillScoresForTrainee(
    traineeId: string,
  ): Promise<{ skill: Skill; score: number; endedAt: string; sessionId: string }[]>;
  listMissedSignsForTrainee(
    traineeId: string,
  ): Promise<{ code: string; status: string }[]>;
}

export type { DebriefView };
