import { Link } from "react-router-dom";
import { cn } from "./cn";
import { DistressCurveMark } from "./DistressCurve";

export function Wordmark({
  className,
  to = "/",
  size = "md",
}: {
  className?: string;
  to?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { title: "text-xl", curve: "h-3 w-10", gap: "gap-1.5" },
    md: { title: "text-2xl", curve: "h-4 w-12", gap: "gap-2" },
    lg: { title: "text-4xl md:text-5xl", curve: "h-5 w-16", gap: "gap-2.5" },
  }[size];

  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex flex-col items-start no-underline",
        sizes.gap,
        className,
      )}
    >
      <span className="inline-flex items-center gap-2">
        <DistressCurveMark className={sizes.curve} />
        <span
          className={cn(
            "font-display font-semibold tracking-tight text-teal-900 transition group-hover:text-teal-700",
            sizes.title,
          )}
        >
          First Line
        </span>
      </span>
    </Link>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-800 text-teal-50",
        className,
      )}
      aria-hidden
    >
      <DistressCurveMark className="h-3.5 w-8" tone="amber" animated={false} />
    </span>
  );
}
