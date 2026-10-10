import { useState } from "react";
import type { TurnView } from "@shared";
import { Badge } from "../ui";
import { DistressMeter } from "./DistressMeter";

export function TrainingOverlay({
  distress,
  trust,
  previous,
  history,
}: {
  distress: number;
  trust?: number | null;
  previous: number | null;
  history: Pick<TurnView, "seq" | "distress" | "trust">[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50/60">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2">
          <Badge tone="amber">Training overlay</Badge>
          <span className="text-sm font-medium text-ink">Distress & trust</span>
        </span>
        {!open && (
          <DistressMeter
            distress={distress}
            trust={trust}
            previous={previous}
            history={history}
            collapsed
          />
        )}
        <span className="text-ink-muted" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="border-t border-amber-100 px-3 py-3">
          <DistressMeter
            distress={distress}
            trust={trust}
            previous={previous}
            history={history}
          />
        </div>
      )}
    </div>
  );
}
