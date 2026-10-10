import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ReadinessReport } from "@shared";
import { featuresApi } from "../api";
import {
  Badge,
  Button,
  DistressCurveMark,
  Panel,
  ProgressBar,
  Skeleton,
} from "../../ui";

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
    void (async () => {
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
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <p className="animate-soft-pulse text-sm text-ink-muted">
          Loading readiness report…
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <DistressCurveMark className="h-4 w-14" />
        <h1 className="mt-3 font-display text-3xl font-semibold text-teal-900">
          Readiness
        </h1>
        <Panel className="mt-6" role="alert">
          <p className="text-sm text-risk">{error ?? "Report unavailable"}</p>
          <Link to="/" className="mt-4 inline-block">
            <Button variant="secondary">Back to practice</Button>
          </Link>
        </Panel>
      </div>
    );
  }

  const ready = report.verdict.startsWith("Ready");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-10">
      <header className="mb-8 animate-fade-up">
        <DistressCurveMark className="h-4 w-14" />
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-teal-900 md:text-4xl">
          Readiness
        </h1>
        <p className="mt-2 text-ink-muted">
          {report.traineeDisplayName}
          {traineeId ? ` · ${report.sessionsCompleted} completed sessions` : ""}
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          AI practice feedback — not a certification or clinical assessment.
        </p>
      </header>

      <Panel
        className={
          ready
            ? "border-success/30 bg-success-soft/60"
            : "border-amber-100 bg-amber-50/80"
        }
      >
        <p className="font-display text-2xl font-semibold text-ink">
          {report.verdict}
        </p>
        {report.overallAvgScore != null && (
          <p className="mt-1 text-sm text-ink-muted">
            Average overall score:{" "}
            <span className="font-semibold text-ink">
              {report.overallAvgScore}
            </span>
          </p>
        )}
      </Panel>

      <section className="mt-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">Why</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
          {report.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-ink">Skill trends</h2>
        <ul className="space-y-3">
          {report.skillTrends.map((s) => (
            <li
              key={s.skill}
              className="rounded-lg border border-line bg-surface-raised p-3"
            >
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink">
                  {SKILL_LABEL[s.skill] ?? s.skill}
                </span>
                <span className="flex items-center gap-2 text-sm text-ink-muted">
                  <Badge
                    tone={
                      s.trend === "up"
                        ? "success"
                        : s.trend === "down"
                          ? "risk"
                          : "neutral"
                    }
                  >
                    {s.trend}
                  </Badge>
                  {s.latestAvg.toFixed(1)}/4 · n={s.samples}
                </span>
              </div>
              <ProgressBar value={s.latestAvg} max={4} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-lg font-semibold text-ink">
            Most-missed signs
          </h2>
          {report.mostMissedWarningSigns.length === 0 ? (
            <p className="text-sm text-ink-muted">No misses recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {report.mostMissedWarningSigns.map((m) => (
                <li
                  key={m.code}
                  className="flex justify-between gap-3 border-b border-line py-2 text-sm last:border-0"
                >
                  <span className="text-ink">{m.label}</span>
                  <span className="shrink-0 tabular-nums text-ink-muted">
                    {m.missRatePct}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <h2 className="mb-3 text-lg font-semibold text-ink">Practice plan</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-muted">
            {report.practicePlan.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </Panel>
      </section>

      {report.distressCurveSample.length > 0 && (
        <Panel className="mt-6">
          <h2 className="mb-1 text-lg font-semibold text-ink">
            Recent distress samples
          </h2>
          <p className="mb-3 text-xs text-ink-muted">
            From completed sessions (Timescale time_bucket when available).
          </p>
          <div className="flex h-16 items-end gap-1">
            {report.distressCurveSample.slice(-24).map((p, i) => (
              <div
                key={`${p.sessionId}-${p.seq}-${i}`}
                title={`distress ${p.distress}`}
                className="flex-1 rounded-t bg-teal-700/70"
                style={{ height: `${Math.max(8, p.distress)}%` }}
              />
            ))}
          </div>
        </Panel>
      )}

      <div className="mt-8">
        <Link to="/">
          <Button size="lg">Back to practice</Button>
        </Link>
      </div>
    </div>
  );
}
