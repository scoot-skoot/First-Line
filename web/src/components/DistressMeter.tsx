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
  const b = band(distress);
  const delta = previous == null ? 0 : distress - previous;
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
          Distress {distress}
        </span>
        <Badge tone={b.tone}>{b.label}</Badge>
        {trust != null && (
          <span className="text-sm text-ink-muted">Trust {trust}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
            Distress
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold tabular-nums text-teal-900">
              {distress}
            </span>
            <span className="text-sm text-ink-muted">/ 100</span>
            {delta !== 0 && (
              <span
                className={`text-sm font-semibold ${
                  delta > 0 ? "text-risk" : "text-success"
                }`}
                aria-label={delta > 0 ? "distress up" : "distress down"}
              >
                {delta > 0 ? "↑" : "↓"}
                {Math.abs(delta)}
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
        value={distress}
        tone={b.tone === "teal" ? "teal" : b.tone === "amber" ? "amber" : "risk"}
      />
      {trust != null && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink-muted">
            <span>Trust</span>
            <span className="tabular-nums font-medium text-ink">{trust}</span>
          </div>
          <ProgressBar value={trust} tone="teal" />
        </div>
      )}
      <p className="text-xs leading-relaxed text-ink-muted">
        Training overlay — real crisis tools don&apos;t show this. Use it to
        notice how your responses move the caller.
      </p>
    </div>
  );
}
