import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ReadinessReport } from "@shared";
import { api } from "../api/client";

export function Readiness() {
  const { traineeId = "" } = useParams();
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setReport(await api.readiness(traineeId));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [traineeId]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/" className="text-sm text-ink-500 hover:text-teal-700">
        ← Practice list
      </Link>
      <h1 className="font-display mt-4 text-3xl font-bold text-ink-900">
        Readiness report
      </h1>
      <p className="mt-2 text-ink-700">
        Practice feedback from session history — not a certification.
      </p>
      {error && (
        <p className="mt-4 rounded-xl border border-rose-100 bg-rose-100/60 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      )}
      {report && (
        <div className="mt-8 space-y-6">
          <div
            className={`rounded-2xl border p-5 ${
              report.verdict === "ready"
                ? "border-teal-100 bg-teal-50"
                : "border-warn-100 bg-warn-100/60"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Verdict
            </p>
            <p className="font-display mt-1 text-2xl font-semibold text-ink-900">
              {report.verdict === "ready"
                ? "Ready for supervised shifts"
                : "Not yet"}
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-700">
              {report.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Per-skill trends
            </h2>
            <ul className="mt-3 space-y-2">
              {report.skillTrends.map((s) => (
                <li
                  key={s.skill}
                  className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2 text-sm"
                >
                  <span className="text-ink-900">{s.skill.replaceAll("_", " ")}</span>
                  <span className="font-mono text-ink-700">
                    avg {s.avgScore.toFixed(1)} · n={s.samples}
                    {s.delta != null ? ` · Δ ${s.delta > 0 ? "+" : ""}${s.delta.toFixed(1)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Most-missed warning signs
            </h2>
            {report.missedWarningSigns.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">No misses recorded yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {report.missedWarningSigns.map((m) => (
                  <li
                    key={m.code}
                    className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink-700"
                  >
                    <span className="font-medium text-ink-900">
                      {m.code.replaceAll("_", " ")}
                    </span>
                    <span className="text-ink-500">
                      {" "}
                      — missed {m.timesMissed}/{m.timesSurfaced} (
                      {m.missRatePct}%)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
              Recommended practice plan
            </h2>
            <ul className="mt-3 space-y-2">
              {report.practicePlan.map((p) => (
                <li
                  key={p.scenarioId}
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
                >
                  <p className="font-medium text-ink-900">{p.title}</p>
                  <p className="text-ink-500">{p.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
