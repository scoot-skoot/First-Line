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

function memorySnippet(memories: string[]): string {
  const first = memories[0] ?? "";
  // Strip leading meta phrases so openings don't say "you said 'Last time you…'"
  const cleaned = first
    .replace(/^last time you (suggested|said|told me)\s+/i, "")
    .replace(/^you (suggested|said|told me)\s+/i, "")
    .replace(/^we talked about\s+/i, "")
    .replace(/^i told you\s+/i, "")
    .trim();
  const text = cleaned || first;
  return text.length > 90 ? `${text.slice(0, 87).trim()}...` : text;
}

function memoryOpening(input: CallerTurnInput): string | null {
  if (input.memories.length === 0) return null;
  const slug = input.persona.slug.split("-")[0] ?? "";
  const snippet = memorySnippet(input.memories);

  if (slug === "ray" && input.scenario.callNumber >= 3) {
    return `It's Ray again. Look — you told me to try ${snippet} and I did. It blew up with my daughter. So what now?`;
  }
  if (slug === "ray" && input.scenario.callNumber >= 2) {
    return `Hey... it's Ray again. About what you said before — ${snippet} — I keep thinking about that.`;
  }
  return `Hey... it's me again. I remember: ${snippet}`;
}

export class MockCaller implements CallerModel {
  private lineIndex = 0;

  async nextTurn(input: CallerTurnInput): Promise<CallerTurn> {
    if (input.interruption) {
      const kind = input.interruption.kind;
      const lines: Record<string, string> = {
        ptt_timeout: "Are you even listening to me?",
        silence: "Hello? ...are you still there?",
        barge_in: "Hey— I wasn't finished. Can I finish?",
      };
      const emotion: CallerTurn["emotion"] =
        kind === "silence"
          ? "anxious"
          : input.currentDistress >= 70
            ? "angry"
            : "irritated";
      return {
        caller_line: lines[kind] ?? lines.ptt_timeout!,
        emotion,
        distress: Math.min(
          100,
          input.currentDistress + (kind === "silence" ? 2 : 5),
        ),
        trust: Math.max(10, 30 - (kind === "barge_in" ? 5 : 2)),
        revealed_warning_signs: [],
        should_end_call: false,
      };
    }

    if (input.isOpening) {
      const remembered = memoryOpening(input);
      const slug = input.persona.slug.split("-")[0] ?? "ray";
      const line = remembered ?? OPENINGS[slug] ?? OPENINGS.ray;
      const emotion =
        remembered && input.scenario.callNumber >= 3
          ? "angry"
          : ((input.persona.baselineEmotion as CallerTurn["emotion"]) || "anxious");
      return {
        caller_line: line,
        emotion,
        distress: input.scenario.initialDistress,
        trust: remembered ? 35 : 30,
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

    let line = LINES[this.lineIndex % LINES.length]!;
    this.lineIndex += 1;

    // On Ray call #3, keep referencing a prior promise when not validating.
    if (
      input.memories.length > 0 &&
      input.scenario.callNumber >= 3 &&
      this.lineIndex === 2
    ) {
      const mem = input.memories[1] ?? input.memories[0]!;
      line = `You told me ${mem.toLowerCase().replace(/\.$/, "")}. That didn't fix anything.`;
    }

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

    const shouldEnd = this.lineIndex >= 5 || (this.lineIndex >= 4 && distress <= 30);

    return {
      caller_line: shouldEnd
        ? "Okay... talking helped a little. I think I can hang up for now."
        : line,
      emotion:
        input.scenario.callNumber >= 3 && distress >= 60
          ? "angry"
          : distress >= 70
            ? "anxious"
            : distress <= 40
              ? "relieved"
              : "flat",
      distress,
      trust,
      revealed_warning_signs: revealed,
      should_end_call: shouldEnd,
    };
  }
}
