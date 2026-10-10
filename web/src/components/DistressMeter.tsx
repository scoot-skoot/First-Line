import type { TurnView } from "@shared";

function band(distress: number): { label: string; color: string } {
  if (distress < 40) return { label: "Lower", color: "#2a8a83" };
  if (distress < 70) return { label: "Elevated", color: "#c9922e" };
  return { label: "Higher", color: "#c45d56" };
}

export function DistressMeter({
  distress,
  trust,
  previous,
  history,
}: {
  distress: number;
  trust?: number | null;
  previous: number | null;
  history: Pick<TurnView, "seq" | "distress">[];
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

  return (
    <div className="rounded-2xl border border-dashed border-teal-500/40 bg-teal-50/70 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
          Training overlay
        </p>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500">
          Not in real 988 tools
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink-500">Caller distress</p>
          <p className="mt-0.5 flex items-baseline gap-2">
            <span
              className="text-4xl font-semibold tabular-nums leading-none"
              style={{ color: b.color }}
            >
              {distress}
            </span>
            <span className="text-sm text-ink-400">/ 100</span>
            {delta !== 0 && (
              <span
                className="text-sm font-medium"
                style={{ color: delta > 0 ? "#c45d56" : "#2a8a83" }}
              >
                {delta > 0 ? "▲" : "▼"}
                {Math.abs(delta)}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: b.color }}>
            {b.label}
            {trust != null ? (
              <span className="ml-2 font-normal text-ink-500">
                · Trust {trust}
              </span>
            ) : null}
          </p>
        </div>
        {spark && (
          <svg width={w} height={h} className="opacity-90" aria-hidden>
            <polyline
              fill="none"
              stroke={b.color}
              strokeWidth="2"
              points={spark}
            />
          </svg>
        )}
      </div>
      <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-white">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${distress}%`,
            background:
              "linear-gradient(90deg, #2a8a83 0%, #c9922e 55%, #c45d56 100%)",
          }}
        />
      </div>
    </div>
  );
}
