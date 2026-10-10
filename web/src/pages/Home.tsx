import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ScenarioSummary } from "@shared";
import { api } from "../api/client";
import { ScenarioCard } from "../components/ScenarioCard";
import {
  CallListSkeleton,
  DistressCurveMark,
  Panel,
} from "../ui";

export function Home() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [traineeId, setTraineeId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [sc, tr] = await Promise.all([api.scenarios(), api.trainees()]);
        setScenarios(sc.scenarios);
        const demo = tr.trainees[0];
        if (demo) setTraineeId(demo.id);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
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

  const next = scenarios[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-10">
      <header className="mb-8 animate-fade-up">
        <DistressCurveMark className="h-5 w-16" />
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-teal-900 md:text-5xl">
          First Line
        </h1>
        <p className="mt-2 max-w-xl text-lg text-ink-muted">
          Your first suicidal caller shouldn&apos;t be your first practice.
        </p>
        <p className="mt-4 max-w-lg text-base text-ink">
          Take a breath. Your next caller is ready.
        </p>
      </header>

      <section aria-labelledby="practice-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="practice-heading"
              className="text-lg font-semibold text-ink"
            >
              Next practice call
            </h2>
            <p className="text-sm text-ink-muted">
              One focused practice at a time — pick a caller and begin.
            </p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link
              to="/readiness"
              className="font-medium text-teal-800 hover:underline"
            >
              Readiness
            </Link>
            <Link
              to="/build-a-caller"
              className="font-medium text-teal-800 hover:underline"
            >
              Build-a-Caller
            </Link>
          </div>
        </div>

        {error && (
          <p
            className="mb-4 rounded-md border border-risk/30 bg-risk-soft px-3 py-2 text-sm text-risk"
            role="alert"
          >
            {error}
          </p>
        )}

        {loading ? (
          <CallListSkeleton />
        ) : scenarios.length === 0 ? (
          <Panel>
            <p className="text-ink-muted">
              No practice calls available yet. Check that the API is running.
            </p>
          </Panel>
        ) : (
          <div className="space-y-3">
            {scenarios.map((s, i) => (
              <ScenarioCard
                key={s.id}
                scenario={s}
                busy={busy}
                featured={i === 0}
                onSelect={(mode) => void start(s.id, mode)}
              />
            ))}
          </div>
        )}

        {next && !loading && (
          <p className="mt-5 text-center text-sm text-ink-muted">
            Suggested next:{" "}
            <span className="font-medium text-ink">{next.personaName}</span> —{" "}
            {next.title}
          </p>
        )}
      </section>
    </div>
  );
}
