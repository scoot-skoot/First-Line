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
  /** ElevenLabs voice id for this persona (optional; added for First Line voices). */
  personaVoiceId?: string | null;
  /** True when this is a recurring-caller callback scenario. */
  isCallback?: boolean;
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

/** Why the caller interrupted the normal turn-taking rhythm. */
export type InterruptionKind = "ptt_timeout" | "silence" | "barge_in";

export interface InterruptionThresholds {
  /** Base PTT hold before caller cuts in (ms), mid-distress. */
  pttHoldMsBase: number;
  pttHoldMsMin: number;
  pttHoldMsMax: number;
  /** Base silence before caller prompts (ms), mid-distress. */
  silenceMsBase: number;
  silenceMsMin: number;
  silenceMsMax: number;
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
  /** True when this turn was an interruption (caller cut in / silence / barge-in). */
  interrupted?: boolean;
  interruptionKind?: InterruptionKind | null;
}

export interface InterruptionRequest {
  kind: InterruptionKind;
  /** Partial trainee transcript when PTT hold timed out. */
  partialText?: string;
  /** Caller turn seq that was cut off (barge-in). */
  bargeInFromSeq?: number;
}

export interface InterruptionResponse {
  traineeTurn: TurnView | null;
  callerTurn: CallerTurnView;
  callEnded: boolean;
  thresholds: InterruptionThresholds;
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

/** Facts the caller remembers from prior calls with this trainee (UI chip). */
export interface CallerRemembersView {
  facts: string[];
  source: "backboard" | "session_history" | "seed" | "none";
}

export interface BuildCallerRequest {
  description: string;
  traineeId?: string;
}

export interface BuildCallerPersonaDraft {
  name: string;
  age: number | null;
  backstory: string;
  speakingStyle: string;
  baselineEmotion: Emotion | string;
  hiddenWarningSigns: string[];
  initialDistress: number;
  situationBrief: string;
  hiddenState: string;
  expectedRiskLevel: RiskLevel;
  contentNotes: string[];
  voiceId: string;
  voiceName: string;
  difficultyTier: number;
  title: string;
}

export interface BuildCallerResponse {
  scenario: ScenarioSummary;
  persona: Pick<
    Persona,
    "id" | "slug" | "name" | "age" | "voiceId" | "backstory" | "speakingStyle" | "baselineEmotion" | "contentNotes"
  >;
  draft: BuildCallerPersonaDraft;
  safetyFallback: boolean;
}

export type ReadinessVerdict = "Ready for supervised shifts" | "Not yet";

export interface ReadinessSkillTrend {
  skill: Skill;
  latestAvg: number;
  priorAvg: number | null;
  trend: "up" | "down" | "flat" | "insufficient_data";
  samples: number;
}

export interface ReadinessReport {
  traineeId: string;
  traineeDisplayName: string;
  sessionsCompleted: number;
  overallAvgScore: number | null;
  skillTrends: ReadinessSkillTrend[];
  mostMissedWarningSigns: MissedSignRow[];
  verdict: ReadinessVerdict;
  reasons: string[];
  practicePlan: string[];
  distressCurveSample: { sessionId: string; seq: number; distress: number; at: string }[];
  generatedAt: string;
}
