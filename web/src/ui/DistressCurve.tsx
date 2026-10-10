import { cn } from "./cn";

/** Signature motif: a soft, breath-like distress curve. */
export function DistressCurveMark({
  className,
  animated = true,
  tone = "brand",
}: {
  className?: string;
  animated?: boolean;
  tone?: "brand" | "amber" | "ink";
}) {
  const stroke =
    tone === "amber"
      ? "var(--color-amber-600)"
      : tone === "ink"
        ? "var(--color-ink-muted)"
        : "var(--color-teal-700)";

  return (
    <svg
      viewBox="0 0 64 24"
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <path
        d="M2 16 C10 16, 12 6, 20 8 C28 10, 30 18, 38 14 C46 10, 50 4, 62 6"
        fill="none"
        stroke={stroke}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? "animate-breath" : undefined}
      />
    </svg>
  );
}

export function DistressCurveChart({
  points,
  markers = [],
  className,
  height = 160,
}: {
  points: { seq: number; distress: number }[];
  markers?: { seq: number; label: string }[];
  className?: string;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-ink-muted">No distress data for this call.</p>
    );
  }

  const w = 560;
  const h = height;
  const padX = 28;
  const padY = 24;
  const xs = points.map((_, i) =>
    points.length === 1
      ? w / 2
      : padX + (i / (points.length - 1)) * (w - padX * 2),
  );
  const ys = points.map(
    (p) => padY + (1 - p.distress / 100) * (h - padY * 2),
  );
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  const area = `${line} L${xs[xs.length - 1]},${h - padY} L${xs[0]},${h - padY} Z`;

  const markerPts = markers
    .map((m) => {
      const idx = points.findIndex((p) => p.seq === m.seq);
      if (idx < 0) return null;
      return { ...m, x: xs[idx], y: ys[idx] };
    })
    .filter(Boolean) as { seq: number; label: string; x: number; y: number }[];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("w-full", className)}
      role="img"
      aria-label="Caller distress over the call"
    >
      <defs>
        <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(13, 74, 86, 0.18)" />
          <stop offset="100%" stopColor="rgba(13, 74, 86, 0)" />
        </linearGradient>
      </defs>
      {[0, 40, 70, 100].map((level) => {
        const y = padY + (1 - level / 100) * (h - padY * 2);
        return (
          <g key={level}>
            <line
              x1={padX}
              y1={y}
              x2={w - padX}
              y2={y}
              stroke="var(--color-line)"
              strokeDasharray={level === 0 || level === 100 ? undefined : "3 6"}
            />
            <text
              x={8}
              y={y + 3}
              fontSize="10"
              fill="var(--color-ink-faint)"
              fontFamily="var(--font-sans)"
            >
              {level}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#curveFill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--color-teal-700)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw-curve"
      />
      {points.map((p, i) => (
        <circle
          key={p.seq}
          cx={xs[i]}
          cy={ys[i]}
          r="4"
          fill="var(--color-surface-raised)"
          stroke="var(--color-amber-600)"
          strokeWidth="2"
        />
      ))}
      {markerPts.map((m) => (
        <g key={`${m.seq}-${m.label}`}>
          <line
            x1={m.x}
            y1={m.y}
            x2={m.x}
            y2={padY - 4}
            stroke="var(--color-risk)"
            strokeDasharray="3 4"
            opacity="0.7"
          />
          <circle cx={m.x} cy={m.y} r="5.5" fill="var(--color-risk)" />
          <title>{m.label}</title>
        </g>
      ))}
    </svg>
  );
}
