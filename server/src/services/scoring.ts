import type { ScoringOutput, Skill } from "../../../shared/types/index.js";

const WEIGHTS: Record<Skill, number> = {
  risk_assessment: 0.3,
  warning_sign_recognition: 0.2,
  active_listening: 0.2,
  empathy: 0.15,
  de_escalation: 0.15,
};

/** overall = round(100 * Σ(weight·score) / 4) */
export function computeOverallScore(output: ScoringOutput): number {
  let sum = 0;
  for (const s of output.skills) {
    const w = WEIGHTS[s.skill] ?? 0;
    sum += w * s.score;
  }
  return Math.round((100 * sum) / 4);
}
