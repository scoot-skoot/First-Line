import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-teal-800 text-teal-50 hover:bg-teal-700 shadow-sm shadow-teal-900/10",
  secondary:
    "bg-surface-raised text-ink border border-line hover:border-line-strong hover:bg-surface",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink",
  danger:
    "bg-risk-soft text-risk border border-risk/30 hover:bg-risk hover:text-white",
  accent:
    "bg-amber-600 text-white hover:bg-amber-700 shadow-sm shadow-amber-700/15",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-5 py-3.5 text-base gap-2 min-h-12",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold transition disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
