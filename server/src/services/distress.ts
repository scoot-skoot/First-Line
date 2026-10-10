import type { CallerTurn } from "../../../shared/types/index.js";

const MAX_DELTA = 20;

export function clampDistress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Apply server-side distress rules:
 * - clamp 0–100
 * - cap change at ±20 vs previous
 * - opening: prefer scenario.initialDistress unless model is within ±10
 */
export function applyDistressRules(opts: {
  raw: number;
  previous: number;
  isOpening: boolean;
  initialDistress: number;
}): { clamped: number; raw: number; capped: boolean } {
  const raw = opts.raw;
  if (opts.isOpening) {
    const within =
      Number.isFinite(raw) && Math.abs(raw - opts.initialDistress) <= 10;
    const clamped = clampDistress(within ? raw : opts.initialDistress);
    return { clamped, raw, capped: !within };
  }

  const desired = clampDistress(raw);
  const delta = desired - opts.previous;
  let capped = false;
  let next = desired;
  if (delta > MAX_DELTA) {
    next = opts.previous + MAX_DELTA;
    capped = true;
  } else if (delta < -MAX_DELTA) {
    next = opts.previous - MAX_DELTA;
    capped = true;
  }
  next = clampDistress(next);
  return { clamped: next, raw, capped };
}

export function filterWarningSigns(
  codes: string[],
  allowed: string[],
): string[] {
  const set = new Set(allowed);
  return codes.filter((c) => set.has(c));
}

export function normalizeCallerTurn(
  turn: CallerTurn,
  opts: {
    previousDistress: number;
    isOpening: boolean;
    initialDistress: number;
    allowedWarningSigns: string[];
  },
): {
  turn: CallerTurn;
  clampInfo: { raw: number; capped: boolean };
} {
  const { clamped, raw, capped } = applyDistressRules({
    raw: turn.distress,
    previous: opts.previousDistress,
    isOpening: opts.isOpening,
    initialDistress: opts.initialDistress,
  });
  const trust = clampDistress(
    opts.isOpening && !(Number.isFinite(turn.trust) && Math.abs(turn.trust - 30) <= 20)
      ? 30
      : turn.trust,
  );
  return {
    turn: {
      ...turn,
      distress: clamped,
      trust,
      revealed_warning_signs: filterWarningSigns(
        turn.revealed_warning_signs,
        opts.allowedWarningSigns,
      ),
    },
    clampInfo: { raw, capped },
  };
}
