import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} aria-hidden />;
}

export function CallListSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading practice calls">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-line bg-surface-raised p-4"
        >
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      ))}
    </div>
  );
}
