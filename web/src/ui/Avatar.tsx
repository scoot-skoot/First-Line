import { cn } from "./cn";

const PALETTES = [
  { bg: "#d5e8eb", fg: "#0d4a56" },
  { bg: "#f5e8d4", fg: "#9a6a24" },
  { bg: "#dde8e4", fg: "#2f7a62" },
  { bg: "#f3e4e0", fg: "#8a4e42" },
  { bg: "#e4e0ef", fg: "#4a4568" },
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function CallerAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const palette = PALETTES[hashName(name) % PALETTES.length];
  const dims = { sm: "h-9 w-9 text-xs", md: "h-12 w-12 text-sm", lg: "h-14 w-14 text-base" }[
    size
  ];

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        dims,
        className,
      )}
      style={{ background: palette.bg, color: palette.fg }}
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 48 48"
        aria-hidden
      >
        <circle cx="24" cy="18" r="8" fill="currentColor" opacity="0.35" />
        <ellipse cx="24" cy="40" rx="14" ry="10" fill="currentColor" opacity="0.25" />
      </svg>
      <span className="relative z-[1]">{initials || "?"}</span>
    </span>
  );
}
