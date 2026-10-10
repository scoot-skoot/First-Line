import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-10 animate-fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
          Dispatch board · Training simulator only
        </p>
        <h1 className="mt-2 font-sans text-4xl font-bold tracking-tight text-ink md:text-5xl">
          SteadyLine
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-muted md:text-lg">
          Practice crisis-line skills with a simulated caller. Pick an incoming
          call, respond with care, and review a skill-focused debrief.
        </p>
        {providers && (
          <p className="mt-3 font-mono text-xs text-ink-muted">{providers}</p>
        )}
      </header>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            Incoming call queue
          </h2>
          <span className="font-mono text-xs text-signal">
            {scenarios.length} waiting
          </span>
        </div>
        {error && (
          <p className="mb-4 border border-alert/40 bg-alert/10 px-3 py-2 text-sm text-alert">
            {error}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
