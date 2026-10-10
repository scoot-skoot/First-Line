import type { DebriefView } from "@shared";
import {
  Badge,
  Button,
  DistressCurveChart,
  DistressCurveMark,
  Panel,
  ProgressBar,
} from "../ui";
import { Link } from "react-router-dom";

const SKILL_LABEL: Record<string, string> = {
  active_listening: "Active listening",
  empathy: "Empathy",
  de_escalation: "De-escalation",
  risk_assessment: "Risk assessment",
  warning_sign_recognition: "Warning signs",
};

export function DebriefCard({ debrief }: { debrief: DebriefView }) {
  const missed = debrief.warningSigns.filter((w) => w.status === "missed");
  const caught = debrief.warningSigns.filter((w) => w.status === "caught");
  const partial = debrief.warningSigns.filter((w) => w.status === "partial");
  const nextStep = debrief.nextSteps[0];
  const markers = missed.map((w) => ({
    seq: w.surfaced_turn_seq,
    label: `Missed: ${w.code.replaceAll("_", " ")}`,
  }));

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <DistressCurveMark className="h-4 w-14" tone="amber" />
        <p className="mt-2 text-xs font-medium uppercase tracking-wider text-ink-faint">
          Practice debrief
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <p className="font-display text-6xl font-semibold tabular-nums text-teal-900">
            {debrief.overallScore}
          </p>
          <div>
            <p className="text-lg font-semibold text-ink">Overall skill score</p>
            <p className="max-w-xl text-sm text-ink-muted">
              AI practice feedback — not a certification or clinical assessment.
            </p>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink">
          {debrief.summary}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Asked directly about suicide:{" "}
          <span className="font-semibold text-ink">
            {debrief.askedDirectlyAboutSuicide ? "Yes" : "Not yet"}
          </span>
        </p>
      </header>

      {nextStep && (
        <Panel className="animate-fade-up border-teal-700/25 bg-teal-50/80">
          <p className="text-xs font-medium uppercase tracking-wider text-teal-700">
            Your next step
          </p>
          <p className="mt-1 font-display text-xl font-semibold text-teal-900">
            {nextStep}
          </p>
          <div className="mt-4">
            <Link to="/">
              <Button size="lg">Practice another call</Button>
            </Link>
          </div>
        </Panel>
      )}

      <Panel>
        <h2 className="mb-1 text-lg font-semibold text-ink">
          Distress over the call
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          Soft markers show missed warning signs when they surfaced.
        </p>
        <DistressCurveChart
          points={debrief.distressCurve}
          markers={markers}
        />
        {markers.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {markers.map((m) => (
              <Badge key={`${m.seq}-${m.label}`} tone="risk">
                Turn {m.seq}: {m.label.replace("Missed: ", "")}
              </Badge>
            ))}
          </ul>
        )}
      </Panel>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Rubric scores</h2>
        <ul className="space-y-3">
          {debrief.skills.map((s) => (
            <li
              key={s.skill}
              className="rounded-lg border border-line bg-surface-raised p-4 shadow-sm shadow-teal-950/5"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-medium text-ink">
                  {SKILL_LABEL[s.skill] ?? s.skill}
                </span>
                <span className="tabular-nums text-lg font-semibold text-teal-800">
                  {s.score}/4
                </span>
              </div>
              <ProgressBar value={s.score} max={4} className="mb-2" />
              <p className="text-sm text-ink-muted">{s.rationale}</p>
              {s.evidence_quote && s.evidence_quote !== "—" && (
                <p className="mt-2 border-l-2 border-amber-600/50 pl-3 text-sm italic text-ink">
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

      <section className="grid gap-4 md:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-lg font-semibold text-ink">
            Caught vs. missed
          </h2>
          {debrief.warningSigns.length === 0 ? (
            <p className="text-sm text-ink-muted">None surfaced this call.</p>
          ) : (
            <div className="space-y-4">
              <SignGroup title="Caught" tone="success" items={caught} />
              <SignGroup title="Partial" tone="amber" items={partial} />
              <SignGroup title="Missed" tone="risk" items={missed} />
            </div>
          )}
        </Panel>
        <Panel>
          <h2 className="mb-3 text-lg font-semibold text-ink">Strengths</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink">
            {debrief.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {debrief.nextSteps.length > 1 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-semibold text-ink">
                More to try
              </h3>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
                {debrief.nextSteps.slice(1).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </section>
    </div>
  );
}

function SignGroup({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "success" | "amber" | "risk";
  items: DebriefView["warningSigns"];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <Badge tone={tone}>{title}</Badge>
        <span className="text-xs text-ink-faint">{items.length}</span>
      </div>
      <ul className="space-y-2">
        {items.map((w) => (
          <li
            key={`${w.code}-${w.surfaced_turn_seq}`}
            className="rounded-md border border-line px-3 py-2 text-sm"
          >
            <p className="font-medium capitalize text-ink">
              {w.code.replaceAll("_", " ")}
            </p>
            <p className="text-ink-muted">{w.explanation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
