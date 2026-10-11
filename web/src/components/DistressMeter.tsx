import { useEffect, useState } from "react";
import type { TurnView } from "@shared";
import { Badge, ProgressBar } from "../ui";
import { DistressCurveMark } from "../ui/DistressCurve";

function band(distress: number): {
  label: string;
  tone: "teal" | "amber" | "risk";
} {
  if (distress < 40) return { label: "Settling", tone: "teal" };
  if (distress < 70) return { label: "Elevated", tone: "amber" };
  return { label: "High distress", tone: "risk" };
}

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "0";
}

function useTweened(value: number, ms = 220): number {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const start = shown;
    const delta = value - start;
    if (delta === 0) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - (1 - p) * (1 - p);
      setShown(Math.round(start + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Intentionally only re-tween when the target value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return shown;
}

export function DistressMeter({
  distress,
  trust,
  previous,
  history,
  collapsed = false,
}: {
  distress: number;
  trust?: number | null;
  previous: number | null;
  history: Pick<TurnView, "seq" | "distress" | "trust">[];
  collapsed?: boolean;
}) {
  const safeDistress = Number.isFinite(distress) ? Math.round(distress) : 0;
  const safeTrust =
    trust == null || !Number.isFinite(trust) ? null : Math.round(trust);
  const displayDistress = useTweened(safeDistress);
  const displayTrust = useTweened(safeTrust ?? 0);
  const b = band(safeDistress);
  const delta = previous == null ? 0 : safeDistress - previous;
  const prevTrust =
    history.length >= 2 ? (history.at(-2)?.trust ?? null) : null;
  const trustDelta =
    safeTrust == null || prevTrust == null ? 0 : safeTrust - prevTrust;
  const points = history
    .filter((h) => h.distress != null)
    .map((h) => h.distress as number);
  const w = 140;
  const h = 32;
  const spark =
    points.length > 1
      ? points
          .map((p, i) => {
            const x = (i / (points.length - 1)) * (w - 4) + 2;
            const y = h - 4 - (p / 100) * (h - 8);
            return `${x},${y}`;
          })
          .join(" ")
      : "";

  if (collapsed) {
    return (
      <div className="flex items-center gap-3">
        <DistressCurveMark className="h-3 w-10" tone="amber" animated={false} />
        <span className="tabular-nums text-sm font-semibold text-ink">
          Distress {displayDistress}
        </span>
        {delta !== 0 && (
          <span
            className={`text-xs font-semibold tabular-nums ${
              delta > 0 ? "text-risk" : "text-success"
            }`}
          >
            {formatDelta(delta)}
          </span>
        )}
        <Badge tone={b.tone}>{b.label}</Badge>
        {safeTrust != null && (
          <span className="text-sm text-ink-muted">Trust {displayTrust}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-slot="distress-meter">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
            Distress
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold tabular-nums text-teal-900 transition-colors duration-200">
              {displayDistress}
            </span>
            <span className="text-sm text-ink-muted">/ 100</span>
            {delta !== 0 && (
              <span
                className={`animate-fade-up text-base font-semibold tabular-nums ${
                  delta > 0 ? "text-risk" : "text-success"
                }`}
                aria-label={`distress ${formatDelta(delta)}`}
                data-slot="distress-delta"
              >
                {formatDelta(delta)}
              </span>
            )}
          </p>
          <Badge tone={b.tone} className="mt-1.5">
            {b.label}
          </Badge>
        </div>
        {spark && (
          <svg width={w} height={h} className="opacity-90" aria-hidden>
            <polyline
              fill="none"
              stroke="var(--color-teal-700)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={spark}
            />
          </svg>
        )}
      </div>
      <ProgressBar
        value={displayDistress}
        tone={b.tone === "teal" ? "teal" : b.tone === "amber" ? "amber" : "risk"}
      />
      {safeTrust != null && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink-muted">
            <span>Trust</span>
            <span className="flex items-center gap-1.5 tabular-nums font-medium text-ink">
              {displayTrust}
              {trustDelta !== 0 && (
                <span
                  className={`text-xs font-semibold ${
                    trustDelta > 0 ? "text-success" : "text-risk"
                  }`}
                  data-slot="trust-delta"
                >
                  {formatDelta(trustDelta)}
                </span>
              )}
            </span>
          </div>
          <ProgressBar value={displayTrust} tone="teal" />
        </div>
      )}
      <p className="text-xs leading-relaxed text-ink-muted">
        Training overlay — real crisis tools don&apos;t show this. Use it to
        notice how your responses move the caller.
      </p>
    </div>
  );
}
