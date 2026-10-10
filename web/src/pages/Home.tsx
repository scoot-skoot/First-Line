import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ScenarioSummary } from "@shared";
import { api } from "../api/client";
import { ScenarioCard } from "../components/ScenarioCard";

export function Home() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [traineeId, setTraineeId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<string>("");

  useEffect(() => {
    void (async () => {
      try {
        const [sc, tr, health] = await Promise.all([
          api.scenarios(),
          api.trainees(),
          api.health(),
        ]);
        setScenarios(sc.scenarios);
        const demo = tr.trainees[0];
        if (demo) setTraineeId(demo.id);
        setProviders(
          `ai=${health.providers.ai} · voice=${health.providers.voice} · memory=${health.providers.memory} · repo=${health.providers.repo}`,
        );
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  async function start(scenarioId: string, mode: "text" | "voice") {
    if (!traineeId) return;
    setBusy(true);
    setError(null);
    try {
      const { session } = await api.startSession({
        traineeId,
        scenarioId,
        mode,
      });
      navigate(`/call/${session.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-10 animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Counselor practice · Training simulator only
        </p>
        <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-ink-900 md:text-5xl">
          SteadyLine
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-700 md:text-lg">
          Practice 988-style skills with a simulated caller in a calm workstation.
          Choose a practice call, take notes, and review a skill-focused debrief.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            to="/build"
            className="rounded-xl border border-line bg-white px-3.5 py-2 font-medium text-ink-700 hover:border-teal-500/40"
          >
            Build a caller
          </Link>
          {traineeId && (
            <Link
              to={`/readiness/${traineeId}`}
              className="rounded-xl border border-line bg-white px-3.5 py-2 font-medium text-ink-700 hover:border-teal-500/40"
            >
              Readiness report
            </Link>
          )}
        </div>
        {providers && (
          <p className="mt-4 font-mono text-xs text-ink-400">{providers}</p>
        )}
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Next practice call
            </h2>
            <p className="text-sm text-ink-500">
              Scenario and difficulty — pick one to begin.
            </p>
          </div>
          <span className="text-sm text-teal-700">{scenarios.length} available</span>
        </div>
        {error && (
          <p className="mb-4 rounded-xl border border-rose-100 bg-rose-100/60 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {scenarios.map((s) => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              busy={busy}
              onSelect={(mode) => void start(s.id, mode)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
