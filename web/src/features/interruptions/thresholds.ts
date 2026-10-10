import type { InterruptionThresholds } from "@shared";

/** Defaults match server env defaults (INTERRUPT_*). */
export const DEFAULT_INTERRUPTION_THRESHOLDS: InterruptionThresholds = {
  pttHoldMsBase: 14000,
  pttHoldMsMin: 8000,
  pttHoldMsMax: 15000,
  silenceMsBase: 9000,
  silenceMsMin: 5000,
  silenceMsMax: 10000,
};

/** Higher distress → shorter wait (toward min). */
export function scaledMs(
  distress: number,
  min: number,
  max: number,
): number {
  const d = Math.max(0, Math.min(100, distress)) / 100;
  return Math.round(max - d * (max - min));
}

export function pttHoldMsForDistress(
  distress: number,
  t: InterruptionThresholds = DEFAULT_INTERRUPTION_THRESHOLDS,
): number {
  return scaledMs(distress, t.pttHoldMsMin, t.pttHoldMsMax);
}

export function silenceMsForDistress(
  distress: number,
  t: InterruptionThresholds = DEFAULT_INTERRUPTION_THRESHOLDS,
): number {
  return scaledMs(distress, t.silenceMsMin, t.silenceMsMax);
}
