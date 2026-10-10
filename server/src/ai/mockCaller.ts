import type { CallerTurn } from "../../../shared/types/index.js";
import type { CallerModel, CallerTurnInput } from "./types.js";

const OPENINGS: Record<string, string> = {
  maya: "Hi... um, thanks for picking up. I just... I can't seem to calm down about this exam.",
  ray: "Hey... yeah. I haven't really been sleeping. My mind won't shut off.",
  dana: "Look, I've called places before and it didn't help. I don't even know why I'm trying again.",
};

const LINES = [
  "I don't know... it just feels like nothing I do matters anymore.",
  "Yeah. I've been keeping to myself a lot. People get tired of hearing it.",
  "When you put it that way... I guess I have been pretty down.",
  "Thanks for asking that. It's hard to say out loud.",
  "I think... I think I can try one small thing before we hang up.",
];

function isValidating(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes("sounds like") || t.includes("feel") || t.includes("?");
}

export class MockCaller implements CallerModel {
  private lineIndex = 0;

  async nextTurn(input: CallerTurnInput): Promise<CallerTurn> {
    if (input.isOpening) {
      const slug = input.persona.slug.split("-")[0] ?? "ray";
      const line = OPENINGS[slug] ?? OPENINGS.ray;
      return {
        caller_line: line,
        emotion: (input.persona.baselineEmotion as CallerTurn["emotion"]) || "anxious",
        distress: input.scenario.initialDistress,
        trust: 30,
        revealed_warning_signs: [],
        should_end_call: false,
      };
    }

    const lastTrainee = [...input.history].reverse().find((t) => t.speaker === "trainee");
    const text = lastTrainee?.text ?? "";
    const delta = isValidating(text) ? -10 : 10;
    const distress = Math.max(0, Math.min(100, input.currentDistress + delta));
    const trust = Math.max(
      0,
      Math.min(100, 30 + (isValidating(text) ? 8 : -5) + input.history.length),
    );

    const line = LINES[this.lineIndex % LINES.length]!;
    this.lineIndex += 1;

    const revealed: string[] = [];
    if (this.lineIndex === 2 && input.scenario.warningSignCodes.includes("hopelessness")) {
      revealed.push("hopelessness");
    }
    if (this.lineIndex === 3 && input.scenario.warningSignCodes.includes("withdrawal")) {
      revealed.push("withdrawal");
    }
    if (
      this.lineIndex === 4 &&
      input.scenario.warningSignCodes.includes("perceived_burden")
    ) {
      revealed.push("perceived_burden");
    }

    const shouldEnd = this.lineIndex >= 6 || distress <= 35;

    return {
      caller_line: shouldEnd
        ? "Okay... talking helped a little. I think I can hang up for now."
        : line,
      emotion: distress >= 70 ? "anxious" : distress <= 40 ? "relieved" : "flat",
      distress,
      trust,
      revealed_warning_signs: revealed,
      should_end_call: shouldEnd,
    };
  }
}
