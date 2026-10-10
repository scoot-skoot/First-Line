import type { DebriefView } from "@shared";

const SKILL_LABEL: Record<string, string> = {
  active_listening: "Active listening",
  empathy: "Empathy",
  de_escalation: "De-escalation",
  risk_assessment: "Risk assessment",
  warning_sign_recognition: "Warning signs",
};

function DistressChart({ debrief }: { debrief: DebriefView }) {
  const curve = debrief.distressCurve;
  if (curve.length === 0) return null;
  const missed = debrief.warningSigns.filter((w) => w.status === "missed");
  const w = 520;
  const h = 160;
  const pad = 28;
  const xs = curve.map((_, i) =>
    curve.length === 1
      ? w / 2
      : pad + (i / (curve.length - 1)) * (w - pad * 2),
  );
  const ys = curve.map(
    (p) => pad + (1 - p.distress / 100) * (h - pad * 2),
  );
  const points = xs.map((x, i) => `${x},${ys[i]}`).join(" ");

  const markers = missed
    .map((m) => {
      const idx = curve.findIndex((c) => c.seq === m.surfaced_turn_seq);
      if (idx < 0) {
        // nearest caller turn at or after surfaced
        const near = curve.findIndex((c) => c.seq >= m.surfaced_turn_seq);
        if (near < 0) return null;
        return { ...m, idx: near };
      }
      return { ...m, idx };
    })
    .filter(Boolean) as { code: string; idx: number; surfaced_turn_seq: number }[];

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-xl rounded-xl border border-line bg-white"
        role="img"
        aria-label="Distress over time with missed warning-sign markers"
      >
        <text x={8} y={18} className="fill-ink-400" fontSize="10">
          100
        </text>
        <text x={8} y={h - 10} className="fill-ink-400" fontSize="10">
          0
        </text>
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#d3deea" />
        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={h - pad}
          stroke="#d3deea"
        />
        <polyline fill="none" stroke="#2a8a83" strokeWidth="2.5" points={points} />
        {curve.map((p, i) => (
          <circle key={p.seq} cx={xs[i]} cy={ys[i]} r="3.5" fill="#1f6f6a" />
        ))}
        {markers.map((m) => (
          <g key={`${m.code}-${m.idx}`}>
            <line
              x1={xs[m.idx]}
              y1={pad}
              x2={xs[m.idx]}
              y2={h - pad}
              stroke="#c45d56"
              strokeDasharray="3 3"
              opacity="0.7"
            />
            <circle cx={xs[m.idx]} cy={ys[m.idx]} r="6" fill="#c45d56" />
            <text
              x={xs[m.idx] + 8}
              y={Math.max(pad + 8, ys[m.idx] - 8)}
              fontSize="10"
              fill="#a54d47"
            >
              missed: {m.code.replaceAll("_", " ")}
            </text>
          </g>
        ))}
      </svg>
      {markers.length === 0 && (
        <p className="mt-2 text-xs text-ink-500">
          No missed warning-sign markers on this curve.
        </p>
      )}
    </div>
  );
}

export function DebriefCard({ debrief }: { debrief: DebriefView }) {
  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          Practice debrief
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <p className="font-display text-6xl font-bold tabular-nums text-teal-700">
            {debrief.overallScore}
          </p>
          <div>
            <p className="text-lg font-medium text-ink-900">Overall skill score</p>
            <p className="max-w-xl text-sm text-ink-500">
              AI-generated practice feedback, not a certification or clinical
              assessment.
            </p>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-700">
          {debrief.summary}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Distress over time
        </h2>
        <DistressChart debrief={debrief} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Skills (0–4)
        </h2>
        <ul className="space-y-3">
          {debrief.skills.map((s) => (
            <li
              key={s.skill}
              className="rounded-2xl border border-line bg-white/90 p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-medium text-ink-900">
                  {SKILL_LABEL[s.skill] ?? s.skill}
                </span>
                <span className="font-mono text-lg text-teal-700">{s.score}/4</span>
              </div>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-surface-100">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{ width: `${(s.score / 4) * 100}%` }}
                />
              </div>
              <p className="text-sm text-ink-500">{s.rationale}</p>
              {s.evidence_quote && s.evidence_quote !== "—" && (
                <p className="mt-2 border-l-2 border-teal-500/40 pl-3 text-sm italic text-ink-700">
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
            Warning signs
          </h2>
          {debrief.warningSigns.length === 0 ? (
            <p className="text-sm text-ink-500">None surfaced this call.</p>
          ) : (
            <ul className="space-y-2">
              {debrief.warningSigns.map((w) => (
                <li
                  key={`${w.code}-${w.surfaced_turn_seq}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink-900">
                      {w.code.replaceAll("_", " ")}
                    </p>
                    <p className="text-ink-500">{w.explanation}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold uppercase ${
                      w.status === "caught"
                        ? "text-teal-700"
                        : w.status === "partial"
                          ? "text-warn-600"
                          : "text-rose-600"
                    }`}
                  >
                    {w.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-ink-500">
            Asked directly about suicide:{" "}
            <span className="font-medium text-ink-900">
              {debrief.askedDirectlyAboutSuicide ? "Yes" : "No"}
            </span>
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Strengths
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
              {debrief.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Try next time
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-700">
              {debrief.nextSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
