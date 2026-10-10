import type { ScenarioSummary } from "@shared";
import { Badge, Button, CallerAvatar } from "../ui";

const TIER_LABEL: Record<number, string> = {
  1: "Supportive listening",
  2: "Ambivalence",
  3: "Escalated",
};

const RISK_TONE: Record<string, "teal" | "amber" | "risk"> = {
  low: "teal",
  moderate: "amber",
  high: "risk",
};

export function ScenarioCard({
  scenario,
  onSelect,
  busy,
  featured = false,
}: {
  scenario: ScenarioSummary;
  onSelect: (mode: "text" | "voice") => void;
  busy?: boolean;
  featured?: boolean;
}) {
  return (
    <article
      className={`animate-fade-up flex flex-col gap-4 rounded-lg border bg-surface-raised p-4 shadow-sm shadow-teal-950/5 sm:flex-row sm:items-center ${
        featured
          ? "border-teal-700/35 ring-1 ring-teal-700/15"
          : "border-line"
      }`}
    >
      <CallerAvatar name={scenario.personaName} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Badge tone="teal">Tier {scenario.difficultyTier}</Badge>
          <Badge tone={RISK_TONE[scenario.expectedRiskLevel] ?? "neutral"}>
            {scenario.expectedRiskLevel} risk
          </Badge>
          {scenario.callNumber > 1 ? (
            <Badge tone="amber">Callback #{scenario.callNumber}</Badge>
          ) : null}
        </div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          {scenario.personaName}
          {scenario.personaAge != null ? (
            <span className="font-sans text-base font-normal text-ink-muted">
              , {scenario.personaAge}
            </span>
          ) : null}
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          {scenario.title}
          <span className="mx-1.5 text-line-strong">·</span>
          {TIER_LABEL[scenario.difficultyTier] ?? "Practice"}
          {scenario.personaVoiceId ? (
            <>
              <span className="mx-1.5 text-line-strong">·</span>
              Voice{" "}
              {scenario.personaVoiceId === "EXAVITQu4vr4xnSDxMaL"
                ? "Sarah"
                : scenario.personaVoiceId === "TX3LPaxmHKxFdv7VOQHJ"
                  ? "Liam"
                  : scenario.personaVoiceId === "21m00Tcm4TlvDq8ikWAM"
                    ? "Rachel"
                    : scenario.personaVoiceId.slice(0, 8)}
            </>
          ) : null}
        </p>
        {scenario.contentNotes.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {scenario.contentNotes.slice(0, 3).map((n) => (
              <li
                key={n}
                className="rounded border border-line bg-surface-muted px-2 py-0.5 text-xs text-ink-muted"
              >
                {n}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <Button
          size="lg"
          disabled={busy}
          onClick={() => onSelect("voice")}
          className="w-full sm:w-auto"
        >
          Take call
        </Button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSelect("text")}
          className="text-sm font-medium text-ink-muted underline-offset-2 hover:text-teal-800 hover:underline disabled:opacity-45"
        >
          Text practice instead
        </button>
      </div>
    </article>
  );
}
