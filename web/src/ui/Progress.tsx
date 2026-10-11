import { cn } from "./cn";

export function ProgressBar({
  value,
  max = 100,
  className,
  tone = "teal",
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "teal" | "amber" | "risk";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  // low/settling → peach; mid → orange; high → primary red
  const fill =
    tone === "amber"
      ? "bg-amber-600"
      : tone === "risk"
        ? "bg-risk"
        : "bg-peach";

  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-surface-muted", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500 ease-out", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ChecklistProgress({
  done,
  total,
  label = "assessed",
}: {
  done: number;
  total: number;
  label?: string;
}) {
  return (
    <p className="text-sm text-ink-muted">
      <span className="font-semibold text-teal-800">
        {done} of {total}
      </span>{" "}
      {label}
    </p>
  );
}
