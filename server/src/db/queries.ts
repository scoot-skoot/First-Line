/**
 * HUMAN-OWNED (David). Agent: keep signatures + comments; do not implement real SQL.
 * Each function has a simple working fallback (empty array) so the app does not break.
 * Readiness Report uses Repository score/warning history instead of these stubs.
 */
import type { Pool } from "pg";
import type {
  DistressRecoveryRow,
  LeaderboardRow,
  MissedSignRow,
  SkillProgressRow,
} from "../../../shared/types/index.js";

/** Leaderboard: opt-in trainees (trainees.leaderboard_opt_in), completed sessions in the last
 *  `windowDays`, AVG(overall_score), COUNT >= 3, RANK() OVER (ORDER BY avg DESC), LIMIT 20. */
export async function leaderboard(
  _pool: Pool,
  _windowDays = 7,
): Promise<LeaderboardRow[]> {
  // TODO(David): implement hand-written SQL described above.
  // Working fallback: empty list (UI shows "no opt-in trainees yet").
  return [];
}

/** Per-skill progress: scores JOIN sessions for one trainee, date_trunc('day', ended_at) buckets,
 *  AVG(score) per (bucket, skill), last `days` days, ordered by bucket. */
export async function skillProgress(
  _pool: Pool,
  _traineeId: string,
  _days = 14,
): Promise<SkillProgressRow[]> {
  // TODO(David): implement hand-written SQL described above.
  // Working fallback: empty — ReadinessService computes trends from Repository.listScoreHistory.
  return [];
}

/** Most-missed warning signs: session_warning_signs JOIN warning_signs, miss rate =
 *  missed / surfaced per code, optionally filtered to one trainee. */
export async function missedWarningSigns(
  _pool: Pool,
  _traineeId: string | null,
): Promise<MissedSignRow[]> {
  // TODO(David): implement hand-written SQL described above.
  // Working fallback: empty — ReadinessService aggregates Repository.listWarningSignHistory.
  return [];
}

/** Distress recovery per session: first caller-turn distress, peak, final, and final - first,
 *  per completed session for one trainee (window functions FIRST_VALUE/LAST_VALUE over turns). */
export async function distressRecovery(
  _pool: Pool,
  _traineeId: string,
): Promise<DistressRecoveryRow[]> {
  // TODO(David): implement hand-written SQL described above.
  // Working fallback: empty — see tigerQueries.traineeDistressBuckets for Timescale path.
  return [];
}
