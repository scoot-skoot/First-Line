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
  // Logo mark sits directly beside the wordmark (inline, vertically centered).
  const sizes = {
    sm: { title: "text-xl", curve: "h-7 w-16", gap: "gap-2.5" },
    md: { title: "text-2xl", curve: "h-8 w-[4.5rem]", gap: "gap-3" },
    lg: { title: "text-4xl md:text-5xl", curve: "h-10 w-24", gap: "gap-3.5" },
  }[size];

  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex items-center no-underline",
        sizes.gap,
        className,
      )}
      aria-label="First Line home"
    >
      <DistressCurveMark className={cn("shrink-0", sizes.curve)} />
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-teal-900 transition-ui group-hover:text-teal-700",
          sizes.title,
        )}
      >
        First Line
      </span>
    </Link>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full bg-teal-800 text-teal-50",
        className,
      )}
      aria-hidden
    >
      <DistressCurveMark className="h-5 w-10" tone="amber" animated={false} />
    </span>
  );
}
