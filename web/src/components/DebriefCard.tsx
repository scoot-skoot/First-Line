import type { DebriefView } from "@shared";

const SKILL_LABEL: Record<string, string> = {
  active_listening: "Active listening",
  empathy: "Empathy",
  de_escalation: "De-escalation",
  risk_assessment: "Risk assessment",
  warning_sign_recognition: "Warning signs",
};

function DistressChart({ curve }: { curve: DebriefView["distressCurve"] }) {
  if (curve.length === 0) return null;
  const w = 420;
  const h = 120;
  const pad = 16;
  const xs = curve.map((_, i) =>
    curve.length === 1
      ? w / 2
      : pad + (i / (curve.length - 1)) * (w - pad * 2),
  );
  const ys = curve.map(
    (p) => pad + (1 - p.distress / 100) * (h - pad * 2),
  );
  const points = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md" role="img" aria-label="Distress over time">
      <rect x="0" y="0" width={w} height={h} fill="#0f1c26" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#243848" />
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#243848" />
      <polyline fill="none" stroke="#e8a838" strokeWidth="2.5" points={points} />
      {curve.map((p, i) => (
        <circle key={p.seq} cx={xs[i]} cy={ys[i]} r="3.5" fill="#3ecf8e" />
      ))}
    </svg>
  );
}

export function DebriefCard({ debrief }: { debrief: DebriefView }) {
  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Practice debrief
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <p className="text-6xl font-semibold tabular-nums text-signal">
            {debrief.overallScore}
          </p>
          <div>
            <p className="text-lg text-ink">Overall skill score</p>
            <p className="max-w-xl text-sm text-ink-muted">
              AI-generated practice feedback, not a certification or clinical
              assessment.
            </p>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink">
          {debrief.summary}
        </p>
      </header>

      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
          Skills (0–4)
        </h2>
        <ul className="space-y-4">
          {debrief.skills.map((s) => (
            <li key={s.skill} className="border border-line bg-console-800/50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-medium text-ink">
                  {SKILL_LABEL[s.skill] ?? s.skill}
                </span>
                <span className="font-mono text-lg text-signal">{s.score}/4</span>
              </div>
              <div className="mb-2 h-2 overflow-hidden rounded-sm bg-console-900">
                <div
                  className="h-full bg-signal transition-all"
                  style={{ width: `${(s.score / 4) * 100}%` }}
                />
              </div>
              <p className="text-sm text-ink-muted">{s.rationale}</p>
              {s.evidence_quote && s.evidence_quote !== "—" && (
                <p className="mt-2 border-l-2 border-signal/40 pl-3 text-sm italic text-ink">
                  “{s.evidence_quote}”
                  {s.evidence_turn_seq != null
                    ? ` — turn ${s.evidence_turn_seq}`
                    : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
            Warning signs
          </h2>
          {debrief.warningSigns.length === 0 ? (
            <p className="text-sm text-ink-muted">None surfaced this call.</p>
          ) : (
            <ul className="space-y-2">
              {debrief.warningSigns.map((w) => (
                <li
                  key={`${w.code}-${w.surfaced_turn_seq}`}
                  className="flex items-start justify-between gap-3 border border-line px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">{w.code.replaceAll("_", " ")}</p>
                    <p className="text-ink-muted">{w.explanation}</p>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-xs uppercase ${
                      w.status === "caught"
                        ? "text-signal"
                        : w.status === "partial"
                          ? "text-amber"
                          : "text-alert"
                    }`}
                  >
                    {w.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-ink-muted">
            Asked directly about suicide:{" "}
            <span className="text-ink">
              {debrief.askedDirectlyAboutSuicide ? "Yes" : "No"}
            </span>
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
            Distress over time
          </h2>
          <DistressChart curve={debrief.distressCurve} />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
            Strengths
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {debrief.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
            Try next time
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {debrief.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
