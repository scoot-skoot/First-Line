/**
 * Local UI contracts for Build a Caller + Readiness.
 * Prefer `@shared` once the features agent's shared/types land on main.
 * Do not edit shared/types from the UI branch.
 */

import type { RiskLevel, ScenarioSummary, Skill } from "@shared";

export interface BuildCallerPersonaDraft {
  name: string;
  age: number | null;
  backstory: string;
  speakingStyle: string;
  baselineEmotion: string;
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
  persona: {
    id: string;
    slug: string;
    name: string;
    age: number | null;
    voiceId: string | null;
    backstory: string;
    speakingStyle: string;
    baselineEmotion: string;
    contentNotes: string[];
  };
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
  mostMissedWarningSigns: {
    code: string;
    label: string;
    fcpCategory: string;
    timesMissed: number;
    timesSurfaced: number;
    missRatePct: number;
  }[];
  verdict: ReadinessVerdict;
  reasons: string[];
  practicePlan: string[];
  distressCurveSample: {
    sessionId: string;
    seq: number;
    distress: number;
    at: string;
  }[];
  generatedAt: string;
}
