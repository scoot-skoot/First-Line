import type {
  DebriefView,
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
}

export type { DebriefView };