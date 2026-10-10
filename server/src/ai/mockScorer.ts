import type { ScoringOutput } from "../../../shared/types/index.js";
import type { Scorer, ScoringInput } from "./types.js";

export class MockScorer implements Scorer {
  async score(input: ScoringInput): Promise<ScoringOutput> {
    const surfaced = new Map<string, number>();
    for (const t of input.history) {
      if (t.speaker === "caller") {
        for (const code of t.revealedWarningSigns) {
          if (!surfaced.has(code)) surfaced.set(code, t.seq);
        }
      }
    }

    const traineeTexts = input.history
      .filter((t) => t.speaker === "trainee")
      .map((t) => t.text.toLowerCase());
    const askedDirectly = traineeTexts.some(
      (t) => t.includes("suicid") || t.includes("ending your life") || t.includes("kill yourself"),
    );

    const warning_signs = [...surfaced.entries()].map(([code, seq]) => {
      const caught = traineeTexts.some(
        (t) =>
          t.includes("burden") ||
          t.includes("hopeless") ||
          t.includes("alone") ||
          t.includes("isolat") ||
          t.includes("sounds like") ||
          t.includes("feel"),
      );
      return {
        code,
        status: (caught ? "caught" : "missed") as "caught" | "missed",
        surfaced_turn_seq: seq,
        response_turn_seq: caught ? seq + 1 : null,
        explanation: caught
          ? "You acknowledged the cue soon after it surfaced."
          : "The cue surfaced but was not clearly explored.",
      };
    });

    return {
      skills: [
        {
          skill: "active_listening",
          score: 3,
          evidence_quote: traineeTexts[0]?.slice(0, 80) || "—",
          evidence_turn_seq: 2,
          rationale: "You used open questions and reflections in places.",
        },
        {
          skill: "empathy",
          score: 3,
          evidence_quote: "That sounds really heavy.",
          evidence_turn_seq: 2,
          rationale: "Validating language appeared in the transcript.",
        },
        {
          skill: "de_escalation",
          score: 2,
          evidence_quote: "—",
          evidence_turn_seq: null,
          rationale: "Pace was mostly calm; room to slow down further.",
        },
        {
          skill: "risk_assessment",
          score: askedDirectly ? 3 : 1,
          evidence_quote: askedDirectly ? "asked about suicide directly" : "—",
          evidence_turn_seq: askedDirectly ? 4 : null,
          rationale: askedDirectly
            ? "You asked directly about suicide."
            : "A direct suicide question was missing.",
        },
        {
          skill: "warning_sign_recognition",
          score: warning_signs.some((w) => w.status === "caught") ? 3 : 1,
          evidence_quote: warning_signs[0]?.code ?? "—",
          evidence_turn_seq: warning_signs[0]?.surfaced_turn_seq ?? null,
          rationale: "Based on caught vs missed warning signs in this practice call.",
        },
      ],
      warning_signs,
      asked_directly_about_suicide: askedDirectly,
      summary:
        "Solid practice call. You stayed present with the caller. Focus next time on asking directly about suicide when cues appear, and naming warning signs out loud.",
      strengths: [
        "Warm, non-judgmental tone",
        "Kept the caller talking",
        "Used some reflective listening",
      ],
      next_steps: [
        "Ask directly about suicide when hopelessness cues appear",
        "Name the warning sign you noticed and invite the caller to say more",
        "Slow your pace after an emotional disclosure",
      ],
    };
  }
}
