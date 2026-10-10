import { useEffect, useState } from "react";

function formatShift(now: Date): string {
  return now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Subtle local shift clock for the counselor workstation header. */
export function ShiftClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className="hidden text-sm text-ink-muted sm:block" aria-live="polite">
      Shift · <time dateTime={now.toISOString()}>{formatShift(now)}</time>
    </p>
  );
}
