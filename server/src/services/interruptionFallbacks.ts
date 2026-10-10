import type { Emotion, InterruptionKind } from "../../../shared/types/index.js";

/** Cached fallback lines for speed when Gemini is slow/unavailable. */
export const INTERRUPTION_FALLBACKS: Record<
  InterruptionKind,
  { line: string; emotion: Emotion }[]
> = {
  ptt_timeout: [
    { line: "Are you even listening to me?", emotion: "irritated" },
    { line: "Hey— I need you to let me finish a thought here.", emotion: "angry" },
    { line: "Okay, that was a long pause on your end... are you still with me?", emotion: "anxious" },
  ],
  silence: [
    { line: "Hello? ...are you still there?", emotion: "anxious" },
    { line: "Did I lose you? I— I don't want to sit here in silence.", emotion: "tearful" },
    { line: "You still there? It's quiet.", emotion: "flat" },
  ],
  barge_in: [
    { line: "Hey— I wasn't finished. Can I finish?", emotion: "irritated" },
    { line: "Wait. Let me finish what I was saying.", emotion: "angry" },
    { line: "I... okay. You cut me off, but go ahead.", emotion: "flat" },
  ],
};

export function pickFallback(
  kind: InterruptionKind,
  distress: number,
): { line: string; emotion: Emotion } {
  const list = INTERRUPTION_FALLBACKS[kind];
  const idx =
    distress >= 75 ? Math.min(1, list.length - 1) : distress >= 50 ? 0 : list.length - 1;
  return list[idx] ?? list[0]!;
}
