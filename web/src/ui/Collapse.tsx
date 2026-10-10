import { useId, useState } from "react";
import { cn } from "./cn";

export function Collapse({
  title,
  children,
  defaultOpen = false,
  meta,
  className,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  meta?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={cn("border-b border-line last:border-b-0", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="font-semibold text-ink">{title}</span>
        <span className="flex items-center gap-2">
          {meta}
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded border border-line text-ink-muted transition",
              open && "rotate-180 bg-surface-muted",
            )}
            aria-hidden
          >
            ▾
          </span>
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={cn("pb-3", open && "animate-fade-up")}
      >
        {children}
      </div>
    </div>
  );
}
