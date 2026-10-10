import type { ScenarioSummary } from "@shared";

const TIER_LABEL: Record<number, string> = {
  1: "Supportive listening",
  2: "Ambivalence & risk cues",
  3: "Escalated / frustrated caller",
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
    <article className="animate-fade-up rounded-2xl border border-line bg-white/80 p-5 shadow-sm shadow-ink-900/5 transition hover:border-teal-500/30 hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-500">
        <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-teal-700">
          Difficulty {scenario.difficultyTier}
        </span>
        <span>{TIER_LABEL[scenario.difficultyTier] ?? "Practice"}</span>
        {scenario.callNumber > 1 && (
          <span className="rounded-full bg-sand-100 px-2.5 py-0.5 text-ink-700">
            Call #{scenario.callNumber}
          </span>
        )}
      </div>
      <h2 className="font-display text-xl font-semibold tracking-tight text-ink-900">
        {scenario.personaName}
        {scenario.personaAge != null ? (
          <span className="font-sans text-base font-normal text-ink-500">
            , {scenario.personaAge}
          </span>
        ) : null}
      </h2>
      <p className="mt-1 text-base text-ink-700">{scenario.title}</p>
      <p className="mt-2 text-sm text-ink-500">
        Expected risk: {scenario.expectedRiskLevel}
        <span className="mx-2 text-line">·</span>
        Training overlay starts at {scenario.initialDistress}
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {scenario.contentNotes.map((n) => (
          <li
            key={n}
            className="rounded-full border border-line bg-surface-50 px-2.5 py-0.5 text-xs text-ink-500"
          >
            {n}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-400">
        Training simulator only
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onSelect("voice")}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          Start practice call
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSelect("text")}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:border-teal-500/40 disabled:opacity-50"
        >
          Text only
        </button>
      </div>
    </article>
  );
}
