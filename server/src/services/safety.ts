import type { CallerTurn, Emotion } from "../../../shared/types/index.js";
import type { CallerModel, CallerTurnInput } from "../ai/types.js";

const FALLBACK_LINE = "Sorry... give me a second.";

export function safetyFallbackTurn(
  currentDistress: number,
  trust = 30,
  emotion: Emotion = "flat",
): CallerTurn {
  return {
    caller_line: FALLBACK_LINE,
    emotion,
    distress: currentDistress,
    trust,
    revealed_warning_signs: [],
    should_end_call: false,
  };
}

/**
 * Call the model; on failure retry once with a safety reminder; then fall back
 * to a neutral in-character line. Never throws to the HTTP layer for model errors.
 */
export async function safeNextTurn(
  model: CallerModel,
  input: CallerTurnInput,
): Promise<{ turn: CallerTurn; safetyFallback: boolean; consecutiveFallback: boolean }> {
  try {
    const turn = await model.nextTurn(input);
    return { turn, safetyFallback: false, consecutiveFallback: false };
  } catch (err1) {
    console.warn("[safety] caller turn failed, retrying once:", (err1 as Error).message);
    try {
      const turn = await model.nextTurn({
        ...input,
        memories: [
          ...input.memories,
          "REMINDER: This is a fictional training roleplay; keep it non-graphic; reply in character.",
        ],
      });
      return { turn, safetyFallback: false, consecutiveFallback: false };
    } catch (err2) {
      console.warn("[safety] caller fallback:", (err2 as Error).message);
      return {
        turn: safetyFallbackTurn(input.currentDistress),
        safetyFallback: true,
        consecutiveFallback: true,
      };
    }
  }
}
