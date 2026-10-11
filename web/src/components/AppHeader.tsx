import { NavLink } from "react-router-dom";
import { Wordmark } from "../ui";
import { ShiftClock } from "./ShiftClock";
import { cn } from "../ui/cn";

const nav = [
  { to: "/", label: "Practice", end: true },
  { to: "/readiness", label: "Readiness" },
  { to: "/build-a-caller", label: "Build a Caller" },
];

export function AppHeader() {
  return (
    <header className="border-b border-line bg-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Wordmark size="md" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition",
                    isActive
                      ? "bg-teal-50 text-teal-800"
                      : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ShiftClock />
          <a
            href="https://988lifeline.org"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-teal-800 hover:underline"
          >
            988 resources
          </a>
        </div>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden"
        aria-label="Main mobile"
      >
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
                isActive
                  ? "bg-teal-50 text-teal-800"
                  : "text-ink-muted hover:bg-surface-muted",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
