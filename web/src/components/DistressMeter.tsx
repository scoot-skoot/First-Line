import type { TurnView } from "@shared";

function band(distress: number): { label: string; color: string } {
  if (distress < 40) return { label: "Calm", color: "#3ecf8e" };
  if (distress < 70) return { label: "Elevated", color: "#e8a838" };
  return { label: "High", color: "#e85d4c" };
}

export function DistressMeter({
  distress,
  previous,
  history,
}: {
  distress: number;
  previous: number | null;
  history: Pick<TurnView, "seq" | "distress">[];
}) {
  const b = band(distress);
  const delta = previous == null ? 0 : distress - previous;
  const points = history
    .filter((h) => h.distress != null)
    .map((h) => h.distress as number);
  const w = 160;
  const h = 36;
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
    <div className="animate-meter rounded-sm border border-line bg-console-900/80 p-4">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            Caller distress
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span
              className="text-5xl font-semibold tabular-nums leading-none"
              style={{ color: b.color }}
            >
              {distress}
            </span>
            <span className="font-mono text-sm text-ink-muted">/ 100</span>
            {delta !== 0 && (
              <span
                className="font-mono text-lg"
                style={{ color: delta > 0 ? "#e85d4c" : "#3ecf8e" }}
                aria-label={delta > 0 ? "distress up" : "distress down"}
              >
                {delta > 0 ? "▲" : "▼"}
                {Math.abs(delta)}
              </span>
            )}
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: b.color }}>
            {b.label}
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
      <div className="relative h-3 overflow-hidden rounded-sm bg-console-800">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
          style={{
            width: `${distress}%`,
            background: `linear-gradient(90deg, #3ecf8e 0%, #e8a838 55%, #e85d4c 100%)`,
          }}
        />
        <div className="absolute inset-0 flex">
          <div className="w-[40%] border-r border-console-950/40" />
          <div className="w-[30%] border-r border-console-950/40" />
          <div className="w-[30%]" />
        </div>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-wider text-ink-muted">
        <span>0 calm</span>
        <span>40</span>
        <span>70</span>
        <span>100</span>
      </div>
    </div>
  );
}
