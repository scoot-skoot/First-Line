import type { ScenarioSummary } from "@shared";

const TIER_LABEL: Record<number, string> = {
  1: "Supportive listening",
  2: "Ambivalence",
  3: "Escalated",
};

export function ScenarioCard({
  scenario,
  onSelect,
  busy,
}: {
  scenario: ScenarioSummary;
  onSelect: (mode: "text" | "voice") => void;
  busy?: boolean;
}) {
  return (
    <article className="animate-fade-up group relative overflow-hidden rounded-sm border border-line bg-console-800/60 p-5 transition hover:border-signal/40 hover:bg-console-700/40">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-signal/70 opacity-70 transition group-hover:opacity-100" />
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-ink-muted">
        <span className="rounded-sm border border-line px-2 py-0.5 text-signal">
          Tier {scenario.difficultyTier}
        </span>
        <span>{TIER_LABEL[scenario.difficultyTier] ?? "Practice"}</span>
        <span className="text-line">·</span>
        <span>Training only</span>
      </div>
      <h2 className="font-sans text-xl font-semibold tracking-tight text-ink">
        {scenario.personaName}
        {scenario.personaAge != null ? (
          <span className="text-ink-muted">, {scenario.personaAge}</span>
        ) : null}
      </h2>
      <p className="mt-1 text-base text-ink-muted">{scenario.title}</p>
      <p className="mt-3 text-sm text-ink-muted">
        Initial distress{" "}
        <span className="font-mono text-amber">{scenario.initialDistress}</span>
        <span className="mx-2 text-line">·</span>
        Risk {scenario.expectedRiskLevel}
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {scenario.contentNotes.map((n) => (
          <li
            key={n}
            className="border border-line/80 bg-console-900/50 px-2 py-0.5 text-xs text-ink-muted"
          >
            {n}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSelect("voice")}
          className="bg-signal px-4 py-2 text-sm font-semibold text-console-950 transition hover:bg-signal/90 disabled:opacity-50"
        >
          Take call (voice)
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSelect("text")}
          className="border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-ink-muted disabled:opacity-50"
        >
          Text practice
        </button>
      </div>
    </article>
  );
}
