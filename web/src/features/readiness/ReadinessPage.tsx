import { useEffect, useState } from "react";
import type { ReadinessReport } from "@shared";
import { featuresApi } from "../api";

const SKILL_LABEL: Record<string, string> = {
  active_listening: "Active listening",
  empathy: "Empathy",
  de_escalation: "De-escalation",
  risk_assessment: "Risk assessment",
  warning_sign_recognition: "Warning signs",
};

export function ReadinessPage() {
  const [traineeId, setTraineeId] = useState<string | null>(null);
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { trainees } = await featuresApi.trainees();
        const id = trainees[0]?.id;
        if (!id) throw new Error("No demo trainee found");
        if (cancelled) return;
        setTraineeId(id);
        const { report: r } = await featuresApi.readiness(id);
        if (!cancelled) setReport(r);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-ink-muted">
        Loading readiness report…
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-red-700" role="alert">
        {error ?? "Report unavailable"}
      </div>
    );
  }

  const ready = report.verdict.startsWith("Ready");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">
        Progress · First Line
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        Readiness report
      </h1>
      <p className="mt-2 text-ink-muted">
        {report.traineeDisplayName}
        {traineeId ? ` · ${report.sessionsCompleted} completed sessions` : ""}
      </p>
      <p className="mt-1 font-mono text-xs text-ink-muted">
        AI practice feedback, not a certification or clinical assessment.
      </p>

      <div
        className={`mt-8 rounded-md border px-4 py-3 ${
          ready
            ? "border-emerald-700/40 bg-emerald-50 text-emerald-950"
            : "border-amber-700/40 bg-amber-50 text-amber-950"
        }`}
      >
        <p className="text-lg font-semibold">{report.verdict}</p>
        {report.overallAvgScore != null && (
          <p className="mt-1 text-sm">
            Average overall score: {report.overallAvgScore}
          </p>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Why</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
          {report.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Skill trends</h2>
        <ul className="mt-3 space-y-2">
          {report.skillTrends.map((s) => (
            <li
              key={s.skill}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line/60 py-2 text-sm"
            >
              <span className="text-ink">{SKILL_LABEL[s.skill] ?? s.skill}</span>
              <span className="font-mono text-ink-muted">
                {s.latestAvg.toFixed(1)}/4 · {s.trend} · n={s.samples}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Most-missed warning signs</h2>
        {report.mostMissedWarningSigns.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">No misses recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {report.mostMissedWarningSigns.map((m) => (
              <li
                key={m.code}
                className="flex justify-between gap-3 border-b border-line/60 py-2 text-sm"
              >
                <span className="text-ink">{m.label}</span>
                <span className="font-mono text-ink-muted">
                  {m.missRatePct}% miss · {m.timesMissed}/{m.timesSurfaced}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Practice plan</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-muted">
          {report.practicePlan.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </section>

      {report.distressCurveSample.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-ink">Recent distress samples</h2>
          <p className="mt-1 text-xs text-ink-muted">
            From completed sessions (Timescale time_bucket when available).
          </p>
          <div className="mt-3 flex h-16 items-end gap-1">
            {report.distressCurveSample.slice(-24).map((p, i) => (
              <div
                key={`${p.sessionId}-${p.seq}-${i}`}
                title={`distress ${p.distress}`}
                className="flex-1 rounded-t bg-signal/70"
                style={{ height: `${Math.max(8, p.distress)}%` }}
              />
            ))}
          </div>
        </section>
      )}

      <a href="/" className="mt-10 inline-block text-sm text-signal underline">
        Back to dispatch
      </a>
    </div>
  );
}
