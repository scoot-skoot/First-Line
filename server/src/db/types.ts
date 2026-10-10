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
  Skill,
  Trainee,
  TurnRecord,
} from "../../../shared/types/index.js";

export interface LocalMemoryFact {
  content: string;
  source: string;
  sessionId?: string | null;
  createdAt: string;
}

export interface CreatePlayableScenarioInput {
  persona: {
    slug: string;
    name: string;
    age: number | null;
    voiceId: string;
    backstory: string;
    speakingStyle: string;
    baselineEmotion: string;
    isRecurring: boolean;
    contentNotes: string[];
  };
  scenario: {
    title: string;
    callNumber: number;
    difficultyTier: number;
    situationBrief: string;
    hiddenState: string;
    expectedRiskLevel: "low" | "moderate" | "high";
    initialDistress: number;
    warningSignCodes: string[];
    warningSignHints: Record<string, string>;
  };
}

export interface ScoreHistoryRow {
  sessionId: string;
  endedAt: string;
  overallScore: number | null;
  skill: Skill;
  score: number;
  scenarioTitle: string;
  personaName: string;
}

export interface WarningSignHistoryRow {
  code: string;
  label: string;
  fcpCategory: string;
  status: "caught" | "partial" | "missed";
  sessionId: string;
}

export interface Repository {
  listScenarios(): Promise<ScenarioSummary[]>;
  getScenarioWithPersona(
    scenarioId: string,
  ): Promise<{ scenario: Scenario; persona: Persona }>;
  listTrainees(): Promise<Trainee[]>;
  getTrainee(id: string): Promise<Trainee | null>;
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
  listLocalMemories(traineeId: string, personaId: string): Promise<LocalMemoryFact[]>;
  appendLocalMemories(
    traineeId: string,
    personaId: string,
    facts: string[],
    source?: string,
    sessionId?: string | null,
  ): Promise<void>;
  createPlayableScenario(
    input: CreatePlayableScenarioInput,
  ): Promise<{ scenario: Scenario; persona: Persona; summary: ScenarioSummary }>;
  listScoreHistory(traineeId: string): Promise<ScoreHistoryRow[]>;
  listWarningSignHistory(traineeId: string): Promise<WarningSignHistoryRow[]>;
  listDistressPointsForTrainee(
    traineeId: string,
    limit?: number,
  ): Promise<{ sessionId: string; seq: number; distress: number; at: string }[]>;
}

export type { DebriefView };
