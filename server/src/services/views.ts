import type {
  CallerTurnView,
  DebriefView,
  TurnRecord,
  TurnView,
} from "../../../shared/types/index.js";
import { config } from "../config.js";

function interruptedFields(t: TurnRecord): Pick<TurnView, "interrupted" | "interruptionKind"> {
  const interrupted = Boolean(t.state?.interrupted);
  const kind = t.state?.interruptionKind;
  return {
    interrupted: interrupted || undefined,
    interruptionKind:
      interrupted && typeof kind === "string"
        ? (kind as TurnView["interruptionKind"])
        : null,
  };
}

export function traineeTurnView(t: TurnRecord): TurnView {
  return {
    seq: t.seq,
    speaker: "trainee",
    text: t.text,
    createdAt: t.createdAt,
    latencyMs: t.latencyMs,
    ...interruptedFields(t),
  };
}

export function callerTurnView(t: TurnRecord): CallerTurnView {
  const hasAudio = config.voiceProvider !== "mock" || true; // mock has asset
  const audioUrl =
    hasAudio && t.speaker === "caller"
      ? `/api/sessions/${t.sessionId}/turns/${t.seq}/audio`
      : null;
  return {
    seq: t.seq,
    speaker: "caller",
    text: t.text,
    createdAt: t.createdAt,
    emotion: t.emotion,
    distress: t.distress,
    trust: t.trust,
    revealedWarningSigns: t.revealedWarningSigns,
    audioUrl,
    safetyFallback: Boolean(t.state?.safetyFallback),
    latencyMs: t.latencyMs,
    ...interruptedFields(t),
  };
}

export function buildDistressCurve(turns: TurnRecord[]): DebriefView["distressCurve"] {
  return turns
    .filter((t) => t.speaker === "caller" && t.distress != null)
    .map((t) => ({ seq: t.seq, distress: t.distress! }));
}
