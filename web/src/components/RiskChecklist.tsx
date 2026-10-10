import { useState } from "react";

const ITEMS = [
  {
    id: "desire",
    title: "Suicidal desire",
    hint: "Wish to die, hopelessness, perceived burden, feeling trapped",
  },
  {
    id: "intent",
    title: "Suicidal intent",
    hint: "Plan, preparatory behavior, or stated intent (ask caringly; no graphic detail)",
  },
  {
    id: "capability",
    title: "Capability",
    hint: "Access to means, prior attempt, substance use, impulsivity",
  },
  {
    id: "buffers",
    title: "Buffers / protective factors",
    hint: "Reasons for living, social supports, future orientation, engagement",
  },
] as const;

export function RiskChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <section className="rounded-2xl border border-line bg-white/90 p-4">
      <h3 className="text-sm font-semibold text-ink-900">Risk assessment checklist</h3>
      <p className="mt-1 text-xs text-ink-500">
        Based on 988 Suicide Safety Policy concepts (Four Core Principles). Tick
        what you explored — for your notes only.
      </p>
      <ul className="mt-3 space-y-2.5">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-transparent px-1 py-1 hover:bg-surface-50">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-teal-600"
                checked={Boolean(checked[item.id])}
                onChange={(e) =>
                  setChecked((c) => ({ ...c, [item.id]: e.target.checked }))
                }
              />
              <span>
                <span className="block text-sm font-medium text-ink-900">
                  {item.title}
                </span>
                <span className="block text-xs text-ink-500">{item.hint}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
