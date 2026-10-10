// Single source of truth for JSON contracts shared by /server and /web.
// Type-only — no runtime imports (shared/ has no node_modules).

export type Emotion =
  | "calm"
  | "anxious"
  | "tearful"
  | "irritated"
  | "angry"
  | "flat"
  | "relieved";

export type Skill =
  | "active_listening"
  | "empathy"
  | "de_escalation"
  | "risk_assessment"
  | "warning_sign_recognition";

export type CallMode = "text" | "voice";
export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type RiskLevel = "low" | "moderate" | "high";
export type WarningSignStatus = "caught" | "partial" | "missed";
export type Speaker = "trainee" | "caller";

export interface CallerTurn {
  caller_line: string;
  emotion: Emotion;
  distress: number;
  trust: number;
  revealed_warning_signs: string[];
  should_end_call: boolean;
}

export interface SkillScore {
  skill: Skill;
  score: number;
  evidence_quote: string;
  evidence_turn_seq: number | null;
  rationale: string;
}

export interface WarningSignResult {
  code: string;
  status: WarningSignStatus;
  surfaced_turn_seq: number;
  response_turn_seq: number | null;
  explanation: string;
}

export interface ScoringOutput {
  skills: SkillScore[];
  warning_signs: WarningSignResult[];
  asked_directly_about_suicide: boolean;
  summary: string;
  strengths: string[];
  next_steps: string[];
}

export interface Persona {
  id: string;
  slug: string;
  name: string;
  age: number | null;
  voiceId: string | null;
  backstory: string;
  speakingStyle: string;
  baselineEmotion: string;
  isRecurring: boolean;
  contentNotes: string[];
}

export interface Scenario {
  id: string;
  personaId: string;
  title: string;
  callNumber: number;
  difficultyTier: number;
  situationBrief: string;
  hiddenState: string;
  expectedRiskLevel: RiskLevel;
  initialDistress: number;
  isActive: boolean;
  warningSignCodes: string[];
  warningSignHints: Record<string, string>;
}

export interface Trainee {
  id: string;
  displayName: string;
  leaderboardOptIn: boolean;
}

export interface TurnRecord {
  id: string;
  sessionId: string;
  seq: number;
  speaker: Speaker;
  text: string;
  distress: number | null;
  trust: number | null;
  emotion: Emotion | null;
  revealedWarningSigns: string[];
  state: Record<string, unknown> | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface SessionRecord {
  id: string;
  traineeId: string;
  scenarioId: string;
  personaId: string;
  mode: CallMode;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  overallScore: number | null;
}

export interface ScenarioSummary {
  id: string;
  title: string;
  personaName: string;
  personaAge: number | null;
  difficultyTier: number;
  contentNotes: string[];
  initialDistress: number;
  expectedRiskLevel: RiskLevel;
  callNumber: number;
}

export interface SessionSummary {
  id: string;
  scenarioTitle: string;
  personaName: string;
  status: SessionStatus;
  overallScore: number | null;
  startedAt: string;
  endedAt: string | null;
}

export interface TurnView {
  seq: number;
  speaker: Speaker;
  text: string;
  createdAt: string;
  emotion?: Emotion | null;
  distress?: number | null;
  trust?: number | null;
  revealedWarningSigns?: string[];
  audioUrl?: string | null;
  safetyFallback?: boolean;
  latencyMs?: number | null;
}

export type CallerTurnView = TurnView;

export interface DebriefView {
  skills: SkillScore[];
  warningSigns: WarningSignResult[];
  askedDirectlyAboutSuicide: boolean;
  summary: string;
  strengths: string[];
  nextSteps: string[];
  overallScore: number;
  distressCurve: { seq: number; distress: number }[];
}

export interface SessionDetail {
  session: SessionRecord;
  turns: TurnRecord[];
  debrief: DebriefView | null;
}

export interface NewSession {
  traineeId: string;
  scenarioId: string;
  personaId: string;
  mode: CallMode;
}

export interface NewTurn {
  sessionId: string;
  speaker: Speaker;
  text: string;
  distress?: number | null;
  trust?: number | null;
  emotion?: Emotion | null;
  revealedWarningSigns?: string[];
  state?: Record<string, unknown> | null;
  latencyMs?: number | null;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface HealthResponse {
  ok: true;
  providers: {
    ai: string;
    voice: string;
    memory: string;
    repo: string;
  };
}

export interface LeaderboardRow {
  traineeId: string;
  displayName: string;
  sessions: number;
  avgScore: number;
  rank: number;
}

export interface SkillProgressRow {
  bucket: string;
  skill: Skill;
  avgScore: number;
  nSessions: number;
}

export interface MissedSignRow {
  code: string;
  label: string;
  fcpCategory: string;
  timesMissed: number;
  timesSurfaced: number;
  missRatePct: number;
}

export interface DistressRecoveryRow {
  sessionId: string;
  firstDistress: number;
  peakDistress: number;
  finalDistress: number;
  delta: number;
}

export interface GeneratedPersona {
  name: string;
  age: number;
  backstory: string;
  speakingStyle: string;
  baselineEmotion: string;
  situationBrief: string;
  hiddenState: string;
  expectedRiskLevel: RiskLevel;
  initialDistress: number;
  difficultyTier: number;
  contentNotes: string[];
  warningSignCodes: string[];
  warningSignHints: Record<string, string>;
  suggestedVoiceId: string;
  suggestedVoiceName: string;
}

export interface ReadinessSkillTrend {
  skill: Skill;
  avgScore: number;
  samples: number;
  delta: number | null;
}

export interface PracticePlanItem {
  scenarioId: string;
  title: string;
  reason: string;
}

export interface ReadinessReport {
  traineeId: string;
  verdict: "ready" | "not_yet";
  reasons: string[];
  skillTrends: ReadinessSkillTrend[];
  missedWarningSigns: MissedSignRow[];
  practicePlan: PracticePlanItem[];
  sessionsCompleted: number;
}
