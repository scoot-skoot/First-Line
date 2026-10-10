import { cn } from "./cn";

type Tone = "neutral" | "teal" | "amber" | "risk" | "success";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-muted border-line",
  teal: "bg-teal-50 text-teal-800 border-teal-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  risk: "bg-risk-soft text-risk border-risk/20",
  success: "bg-success-soft text-success border-success/20",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
