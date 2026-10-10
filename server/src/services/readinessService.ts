import type {
  MissedSignRow,
  ReadinessReport,
  ReadinessSkillTrend,
  Skill,
} from "../../../shared/types/index.js";
import type { Repository } from "../db/types.js";

const SKILLS: Skill[] = [
  "active_listening",
  "empathy",
  "de_escalation",
  "risk_assessment",
  "warning_sign_recognition",
];

const SKILL_LABEL: Record<Skill, string> = {
  active_listening: "Active listening",
  empathy: "Empathy",
  de_escalation: "De-escalation",
  risk_assessment: "Risk assessment",
  warning_sign_recognition: "Warning-sign recognition",
};

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function trendOf(latest: number, prior: number | null): ReadinessSkillTrend["trend"] {
  if (prior == null) return "insufficient_data";
  const d = latest - prior;
  if (d >= 0.25) return "up";
  if (d <= -0.25) return "down";
  return "flat";
}

export class ReadinessService {
  constructor(private repo: Repository) {}

  async report(traineeId: string): Promise<ReadinessReport> {
    const trainee = await this.repo.getTrainee(traineeId);
    if (!trainee) {
      throw Object.assign(new Error("Trainee not found"), { status: 404 });
    }

    const sessions = (await this.repo.listSessionsForTrainee(traineeId)).filter(
      (s) => s.status === "completed",
    );
    const scores = await this.repo.listScoreHistory(traineeId);
    const warnings = await this.repo.listWarningSignHistory(traineeId);
    const distressCurveSample = await this.repo.listDistressPointsForTrainee(
      traineeId,
      40,
    );

    const sessionIdsChrono = [
      ...new Set(
        scores
          .slice()
          .sort((a, b) => a.endedAt.localeCompare(b.endedAt))
          .map((s) => s.sessionId),
      ),
    ];
    const midpoint = Math.max(1, Math.floor(sessionIdsChrono.length / 2));
    const earlyIds = new Set(sessionIdsChrono.slice(0, midpoint));
    const lateIds = new Set(sessionIdsChrono.slice(midpoint));

    const skillTrends: ReadinessSkillTrend[] = SKILLS.map((skill) => {
      const rows = scores.filter((s) => s.skill === skill);
      const latestScores = rows.filter((r) => lateIds.has(r.sessionId)).map((r) => r.score);
      const priorScores = rows.filter((r) => earlyIds.has(r.sessionId)).map((r) => r.score);
      const latestAvg = latestScores.length ? avg(latestScores) : avg(rows.map((r) => r.score));
      const priorAvg = priorScores.length && lateIds.size ? avg(priorScores) : null;
      return {
        skill,
        latestAvg: Math.round(latestAvg * 100) / 100,
        priorAvg: priorAvg == null ? null : Math.round(priorAvg * 100) / 100,
        trend: rows.length < 2 ? "insufficient_data" : trendOf(latestAvg, priorAvg),
        samples: rows.length,
      };
    });

    const missMap = new Map<string, MissedSignRow>();
    for (const w of warnings) {
      const row = missMap.get(w.code) ?? {
        code: w.code,
        label: w.label,
        fcpCategory: w.fcpCategory,
        timesMissed: 0,
        timesSurfaced: 0,
        missRatePct: 0,
      };
      row.timesSurfaced += 1;
      if (w.status === "missed") row.timesMissed += 1;
      missMap.set(w.code, row);
    }
    const mostMissedWarningSigns = [...missMap.values()]
      .map((r) => ({
        ...r,
        missRatePct:
          r.timesSurfaced === 0
            ? 0
            : Math.round((1000 * r.timesMissed) / r.timesSurfaced) / 10,
      }))
      .filter((r) => r.timesMissed > 0)
      .sort((a, b) => b.missRatePct - a.missRatePct || b.timesMissed - a.timesMissed);

    const overallScores = sessions
      .map((s) => s.overallScore)
      .filter((n): n is number => n != null);
    const overallAvgScore = overallScores.length
      ? Math.round(avg(overallScores) * 10) / 10
      : null;

    const risk = skillTrends.find((s) => s.skill === "risk_assessment");
    const signs = skillTrends.find((s) => s.skill === "warning_sign_recognition");
    const reasons: string[] = [];
    const practicePlan: string[] = [];

    if (sessions.length < 3) {
      reasons.push(`Only ${sessions.length} completed practice call(s); need at least 3.`);
      practicePlan.push("Complete two more full practice calls (try Maya, then Ray call #1).");
    }
    if (overallAvgScore != null && overallAvgScore < 65) {
      reasons.push(`Average overall score is ${overallAvgScore} (target ≥ 65).`);
    }
    if (risk && risk.latestAvg < 2.5) {
      reasons.push(
        `Risk assessment average is ${risk.latestAvg.toFixed(1)} / 4 (target ≥ 2.5).`,
      );
      practicePlan.push(
        "Practice asking directly and caringly about suicide when hopelessness or burden cues appear.",
      );
    }
    if (signs && signs.latestAvg < 2.5) {
      reasons.push(
        `Warning-sign recognition average is ${signs.latestAvg.toFixed(1)} / 4.`,
      );
    }
    if (mostMissedWarningSigns[0]) {
      const top = mostMissedWarningSigns[0];
      reasons.push(
        `Most-missed warning sign: ${top.label} (${top.missRatePct}% miss rate).`,
      );
      practicePlan.push(
        `On your next Ray call, listen for ${top.label.toLowerCase()} and reflect it within 1–2 turns.`,
      );
    }

    for (const t of skillTrends) {
      if (t.trend === "down") {
        practicePlan.push(
          `Refresh ${SKILL_LABEL[t.skill]} — scores drifted down vs earlier sessions.`,
        );
      }
    }

    if (practicePlan.length === 0) {
      practicePlan.push("Run Ray, call #3 to practice a repeat caller who remembers you.");
      practicePlan.push("Do one angry/irritated caller (Dana) focusing on de-escalation.");
    }

    const ready =
      sessions.length >= 3 &&
      (overallAvgScore ?? 0) >= 65 &&
      (risk?.latestAvg ?? 0) >= 2.5 &&
      (signs?.latestAvg ?? 0) >= 2.0 &&
      mostMissedWarningSigns.filter((m) => m.missRatePct >= 80).length < 2;

    if (ready) {
      reasons.unshift(
        "Completed enough scored practice with solid risk assessment and warning-sign habits.",
      );
    } else if (reasons.length === 0) {
      reasons.push("Keep practicing — readiness thresholds not yet met.");
    }

    return {
      traineeId,
      traineeDisplayName: trainee.displayName,
      sessionsCompleted: sessions.length,
      overallAvgScore,
      skillTrends,
      mostMissedWarningSigns,
      verdict: ready ? "Ready for supervised shifts" : "Not yet",
      reasons,
      practicePlan: practicePlan.slice(0, 5),
      distressCurveSample,
      generatedAt: new Date().toISOString(),
    };
  }
}
