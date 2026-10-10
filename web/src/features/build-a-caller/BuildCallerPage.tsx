import { useState } from "react";
import type { BuildCallerResponse } from "@shared";
import { featuresApi } from "../api";

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">
        Trainer tools · First Line
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        Build a Caller
      </h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Describe a practice caller in plain language. Gemini drafts a non-graphic
        persona and saves it as a playable scenario.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink">Short description</span>
          <textarea
            className="mt-2 w-full rounded-md border border-line bg-white/80 px-3 py-2 text-ink shadow-sm focus:border-signal focus:outline-none"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. college student, homesick, can't sleep before finals"
          />
        </label>
        <button
          type="submit"
          disabled={loading || description.trim().length < 8}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate scenario"}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {result && (
        <section className="mt-10 space-y-4 border-t border-line pt-8">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-xl font-semibold text-ink">{result.persona.name}</h2>
            <span className="font-mono text-xs text-ink-muted">
              voice {result.draft.voiceName} · tier {result.draft.difficultyTier}
              {result.safetyFallback ? " · safety fallback" : ""}
            </span>
          </div>
          <p className="text-ink">{result.scenario.title}</p>
          <p className="text-sm text-ink-muted">{result.draft.situationBrief}</p>
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Speaking style:</span>{" "}
            {result.draft.speakingStyle}
          </p>
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Hidden warning signs:</span>{" "}
            {result.draft.hiddenWarningSigns.join(", ")}
          </p>
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">Initial distress:</span>{" "}
            {result.draft.initialDistress} · risk {result.draft.expectedRiskLevel}
          </p>
          <a
            href="/"
            className="inline-block text-sm text-signal underline hover:no-underline"
          >
            Back to scenarios — new caller is in the list
          </a>
          <a
            className="ml-4 inline-block rounded-md border border-line px-3 py-1.5 text-sm text-ink"
            href={`/?highlight=${result.scenario.id}`}
          >
            Practice this caller
          </a>
        </section>
      )}
    </div>
  );
}
