import { useState } from "react";
import { Link } from "react-router-dom";
import type { BuildCallerResponse } from "@shared";
import { featuresApi } from "../api";
import {
  Badge,
  Button,
  CallerAvatar,
  DistressCurveMark,
  Panel,
  Skeleton,
} from "../../ui";

export function BuildCallerPage() {
  const [description, setDescription] = useState(
    "veteran, lost job, drinking, firearm at home",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BuildCallerResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await featuresApi.buildCaller(description);
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-10">
      <header className="mb-8 animate-fade-up">
        <DistressCurveMark className="h-4 w-14" />
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-teal-900 md:text-4xl">
          Build a Caller
        </h1>
        <p className="mt-2 max-w-xl text-ink-muted">
          Describe a practice caller in plain language. We draft a non-graphic
          persona and save it as a playable scenario.
        </p>
      </header>

      <Panel>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-ink">
              Short description
            </span>
            <textarea
              className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none placeholder:text-ink-faint focus:border-teal-600"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. college student, homesick, can't sleep before finals"
            />
          </label>
          <Button
            type="submit"
            size="lg"
            disabled={loading || description.trim().length < 8}
          >
            {loading ? "Generating…" : "Generate scenario"}
          </Button>
        </form>
      </Panel>

      {loading && (
        <div className="mt-6 space-y-3" aria-busy="true">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {error && (
        <p
          className="mt-4 rounded-md border border-risk/30 bg-risk-soft px-3 py-2 text-sm text-risk"
          role="alert"
        >
          {error}
        </p>
      )}

      {result && (
        <Panel className="mt-6 animate-fade-up space-y-4">
          <div className="flex items-start gap-3">
            <CallerAvatar name={result.persona.name} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-semibold text-ink">
                  {result.persona.name}
                </h2>
                <Badge tone="teal">Tier {result.draft.difficultyTier}</Badge>
                <Badge
                  tone={
                    result.draft.expectedRiskLevel === "high"
                      ? "risk"
                      : result.draft.expectedRiskLevel === "moderate"
                        ? "amber"
                        : "teal"
                  }
                >
                  {result.draft.expectedRiskLevel} risk
                </Badge>
                {result.safetyFallback ? (
                  <Badge tone="amber">Safety fallback</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                Voice {result.draft.voiceName}
                {result.persona.voiceId
                  ? ` · ${result.persona.voiceId.slice(0, 8)}…`
                  : ""}{" "}
                · initial distress {result.draft.initialDistress}
              </p>
            </div>
          </div>
          <div>
            <p className="font-semibold text-ink">{result.scenario.title}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {result.draft.situationBrief}
            </p>
          </div>
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Speaking style:</span>{" "}
            {result.draft.speakingStyle}
          </p>
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Hidden warning signs:</span>{" "}
            {result.draft.hiddenWarningSigns.join(", ")}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/">
              <Button size="lg">Practice this caller</Button>
            </Link>
            <Link
              to="/"
              className="inline-flex items-center text-sm font-medium text-teal-800 hover:underline"
            >
              Back to practice list
            </Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
