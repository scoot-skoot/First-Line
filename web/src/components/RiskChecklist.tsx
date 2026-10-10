import { useEffect, useState } from "react";
import { ChecklistProgress } from "../ui";
import { cn } from "../ui/cn";

/** 988 Suicide Safety Policy Four Core Principles (trainee self-checklist). */
const RISK_AREAS = [
  {
    id: "desire",
    label: "Suicidal desire",
    hint: "Thoughts of death, hopelessness, feeling like a burden",
  },
  {
    id: "intent",
    label: "Intent",
    hint: "Plans, timeline, or expressed wish to act",
  },
  {
    id: "capability",
    label: "Capability",
    hint: "Access to means, prior attempts, impulsivity, substance use",
  },
  {
    id: "buffers",
    label: "Buffers / protective factors",
    hint: "Reasons for living, social supports, future orientation",
  },
] as const;

type AreaId = (typeof RISK_AREAS)[number]["id"];

const STORAGE_PREFIX = "firstline-risk-";

export function RiskChecklist({ sessionId }: { sessionId: string }) {
  const [checked, setChecked] = useState<Record<AreaId, boolean>>({
    desire: false,
    intent: false,
    capability: false,
    buffers: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + sessionId);
      if (raw) setChecked(JSON.parse(raw) as Record<AreaId, boolean>);
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  function toggle(id: AreaId) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_PREFIX + sessionId, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const done = RISK_AREAS.filter((a) => checked[a.id]).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Risk assessment</h3>
        <ChecklistProgress done={done} total={RISK_AREAS.length} label="risk areas assessed" />
      </div>
      <ul className="space-y-2">
        {RISK_AREAS.map((area) => (
          <li key={area.id}>
            <label
              className={cn(
                "flex cursor-pointer gap-3 rounded-md border px-3 py-2.5 transition",
                checked[area.id]
                  ? "border-teal-100 bg-teal-50"
                  : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-teal-800"
                checked={checked[area.id]}
                onChange={() => toggle(area.id)}
              />
              <span>
                <span className="block text-sm font-medium text-ink">
                  {area.label}
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {area.hint}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
