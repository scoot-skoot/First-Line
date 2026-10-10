import { cn } from "./cn";

export function Panel({
  children,
  className,
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface-raised shadow-sm shadow-teal-950/5",
        padded && "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {meta ? <div className="mt-0.5 text-sm text-ink-muted">{meta}</div> : null}
      </div>
      {action}
    </div>
  );
}
