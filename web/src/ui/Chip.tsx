import { cn } from "./cn";

export function Chip({
  children,
  className,
  tone = "muted",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "memory" | "amber";
  title?: string;
}) {
  const tones = {
    muted: "bg-surface-muted text-ink-muted border-line",
    memory: "bg-teal-50 text-teal-800 border-teal-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <span
      title={title}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 truncate rounded-md border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
