import type {
  CallMode,
  CallerRemembersView,
  CallerTurnView,
  DebriefView,
  InterruptionKind,
  InterruptionResponse,
  InterruptionThresholds,
  ScoringOutput,
  SessionRecord,
  TurnView,
} from "../../../shared/types/index.js";
import type { CallerModel, Scorer } from "../ai/types.js";
import type { Repository } from "../db/types.js";
import { CompositeMemory } from "../memory/compositeMemory.js";
import type { CallerMemory } from "../memory/types.js";
import type { SpeechToText, TextToSpeech } from "../voice/types.js";
import {
  config,
  interruptionThresholdsFromConfig,
} from "../config.js";
import { normalizeCallerTurn } from "./distress.js";
import { pickFallback } from "./interruptionFallbacks.js";
import { safeNextTurn } from "./safety.js";
import { computeOverallScore } from "./scoring.js";
import { callerTurnView, traineeTurnView } from "./views.js";

export class CallService {
  private consecutiveFallbacks = new Map<string, number>();
  private sessionMemories = new Map<string, CallerRemembersView>();

  constructor(
    private repo: Repository,
    private caller: CallerModel,
    private scorer: Scorer,
    private memory: CallerMemory,
    private stt: SpeechToText,
    private tts: TextToSpeech,
  ) {}

  private memorySource(): CallerRemembersView["source"] {
    if (this.memory instanceof CompositeMemory) return this.memory.lastSource;
    return config.memoryProvider === "backboard" ? "backboard" : "session_history";
  }

  getCallerRemembers(sessionId: string): CallerRemembersView | null {
    return this.sessionMemories.get(sessionId) ?? null;
  }

  getInterruptionThresholds(): InterruptionThresholds {
    return interruptionThresholdsFromConfig();
  }

  async interrupt(opts: {
    sessionId: string;
    kind: InterruptionKind;
    partialText?: string;
    audio?: Buffer;
    mimeType?: string;
    bargeInFromSeq?: number;
  }): Promise<InterruptionResponse> {
    const detail = await this.repo.getSession(opts.sessionId);
    if (!detail) throw Object.assign(new Error("Session not found"), { status: 404 });
    if (detail.session.status !== "in_progress") {
      throw Object.assign(new Error("Session is not in progress"), { status: 409 });
    }

    const thresholds = this.getInterruptionThresholds();
    const { scenario, persona } = await this.repo.getScenarioWithPersona(
      detail.session.scenarioId,
    );
    const lastCaller = [...detail.turns]
      .reverse()
      .find((t) => t.speaker === "caller");
    const currentDistress = lastCaller?.distress ?? scenario.initialDistress;

    const started = Date.now();
    let traineeTurn: TurnView | null = null;
    let history = [...detail.turns];

    if (opts.kind === "ptt_timeout") {
      let partial = opts.partialText?.trim() ?? "";
      if (!partial && opts.audio) {
        try {
          partial = await this.stt.transcribe(
            opts.audio,
            opts.mimeType ?? "audio/webm",
          );
        } catch (err) {
          console.warn(
            "[interrupt] STT on partial failed:",
            (err as Error).message,
          );
          partial = "(trainee was speaking — transcript unavailable)";
        }
      }
      if (!partial) partial = "(trainee held the line too long)";

      const savedTrainee = await this.repo.appendTurn({
        sessionId: opts.sessionId,
        speaker: "trainee",
        text: partial,
        state: {
          interrupted: true,
          interruptionKind: "ptt_timeout",
          partial: true,
        },
        latencyMs: null,
      });
      traineeTurn = traineeTurnView(savedTrainee);
      history = [...history, savedTrainee];
    }

    if (opts.kind === "barge_in" && opts.bargeInFromSeq != null) {
      // Mark the cut-off caller turn so later Gemini turns know (not an interruption row).
      const cut = detail.turns.find(
        (t) => t.seq === opts.bargeInFromSeq && t.speaker === "caller",
      );
      if (cut) {
        cut.state = {
          ...(cut.state ?? {}),
          bargeInCutOff: true,
        };
      }
    }

    const memories = await this.memory.recall(
      detail.session.traineeId,
      persona.id,
    );

    const cached = pickFallback(opts.kind, currentDistress);
    let line = cached.line;
    let emotion = cached.emotion;
    let distress = Math.min(100, currentDistress + (opts.kind === "silence" ? 2 : 4));
    let trust = 28;
    let safetyFallback = false;
    let shouldEnd = false;

    const { turn: raw, safetyFallback: fb } = await safeNextTurn(this.caller, {
      persona,
      scenario,
      history,
      currentDistress,
      memories,
      isOpening: false,
      interruption: {
        kind: opts.kind,
        bargeInCutOff: opts.kind === "barge_in",
        partialTraineeText: opts.partialText,
      },
    });

    if (!fb && raw.caller_line?.trim() && raw.caller_line.length <= 220) {
      const { turn } = normalizeCallerTurn(raw, {
        previousDistress: currentDistress,
        isOpening: false,
        initialDistress: scenario.initialDistress,
        allowedWarningSigns: scenario.warningSignCodes,
      });
      line = turn.caller_line;
      emotion = turn.emotion;
      distress = turn.distress;
      trust = turn.trust;
      shouldEnd = turn.should_end_call;
    } else {
      // Model failed or returned a generic safety line — use cached interruption.
      safetyFallback = true;
      line = cached.line;
      emotion = cached.emotion;
    }

    const callerSaved = await this.repo.appendTurn({
      sessionId: opts.sessionId,
      speaker: "caller",
      text: line,
      distress,
      trust,
      emotion,
      revealedWarningSigns: [],
      state: {
        interrupted: true,
        interruptionKind: opts.kind,
        safetyFallback,
        shouldEndCall: shouldEnd,
        bargeInFromSeq: opts.bargeInFromSeq ?? null,
      },
      latencyMs: Date.now() - started,
    });

    return {
      traineeTurn,
      callerTurn: callerTurnView(callerSaved),
      callEnded: shouldEnd,
      thresholds,
    };
  }

  async startSession(opts: {
    traineeId: string;
    scenarioId: string;
    mode: CallMode;
  }): Promise<{
    session: SessionRecord;
    openingTurn: CallerTurnView;
    callerRemembers: CallerRemembersView;
  }> {
    const { scenario, persona } = await this.repo.getScenarioWithPersona(
      opts.scenarioId,
    );
    const memories = await this.memory.recall(opts.traineeId, persona.id);
    const callerRemembers: CallerRemembersView = {
      facts: memories,
      source: memories.length ? this.memorySource() : "none",
    };
    const session = await this.repo.createSession({
      traineeId: opts.traineeId,
      scenarioId: opts.scenarioId,
      personaId: persona.id,
      mode: opts.mode,
    });
    this.sessionMemories.set(session.id, callerRemembers);

    const started = Date.now();
    const { turn: raw, safetyFallback } = await safeNextTurn(this.caller, {
      persona,
      scenario,
      history: [],
      currentDistress: scenario.initialDistress,
      memories,
      isOpening: true,
    });
    const { turn, clampInfo } = normalizeCallerTurn(raw, {
      previousDistress: scenario.initialDistress,
      isOpening: true,
      initialDistress: scenario.initialDistress,
      allowedWarningSigns: scenario.warningSignCodes,
    });

    const saved = await this.repo.appendTurn({
      sessionId: session.id,
      speaker: "caller",
      text: turn.caller_line,
      distress: turn.distress,
      trust: turn.trust,
      emotion: turn.emotion,
      revealedWarningSigns: turn.revealed_warning_signs,
      state: {
        raw: turn,
        clampInfo,
        safetyFallback,
        shouldEndCall: turn.should_end_call,
        callerRemembers,
      },
      latencyMs: Date.now() - started,
    });

    // Warm TTS cache path (audio served on GET)
    void this.tts;

    return { session, openingTurn: callerTurnView(saved), callerRemembers };
  }

  async takeTurn(opts: {
    sessionId: string;
    text?: string;
    audio?: Buffer;
    mimeType?: string;
    /** Trainee barged in on the previous caller audio. */
    bargeIn?: boolean;
    bargeInFromSeq?: number;
  }): Promise<{
    traineeTurn: TurnView;
    callerTurn: CallerTurnView;
    callEnded: boolean;
  }> {
    const detail = await this.repo.getSession(opts.sessionId);
    if (!detail) throw Object.assign(new Error("Session not found"), { status: 404 });
    if (detail.session.status !== "in_progress") {
      throw Object.assign(new Error("Session is not in progress"), { status: 409 });
    }

    const started = Date.now();
    let traineeText = opts.text?.trim() ?? "";
    if (!traineeText && opts.audio) {
      try {
        traineeText = await this.stt.transcribe(
          opts.audio,
          opts.mimeType ?? "audio/webm",
        );
      } catch (err) {
        console.warn("[call] STT failed, need text fallback:", (err as Error).message);
        throw Object.assign(new Error("Speech recognition failed; try text input"), {
          status: 502,
          code: "STT_FAILED",
        });
      }
    }
    if (!traineeText) {
      throw Object.assign(new Error("text or audio required"), { status: 400 });
    }

    const traineeTurn = await this.repo.appendTurn({
      sessionId: opts.sessionId,
      speaker: "trainee",
      text: traineeText,
      state: opts.bargeIn
        ? { bargeIn: true, bargeInFromSeq: opts.bargeInFromSeq ?? null }
        : null,
      latencyMs: null,
    });

    const { scenario, persona } = await this.repo.getScenarioWithPersona(
      detail.session.scenarioId,
    );
    const history = [...detail.turns, traineeTurn];
    const lastCaller = [...detail.turns]
      .reverse()
      .find((t) => t.speaker === "caller");
    if (opts.bargeIn && lastCaller) {
      lastCaller.state = {
        ...(lastCaller.state ?? {}),
        bargeInCutOff: true,
      };
    }
    const currentDistress = lastCaller?.distress ?? scenario.initialDistress;
    const memories = await this.memory.recall(
      detail.session.traineeId,
      persona.id,
    );

    const { turn: raw, safetyFallback } = await safeNextTurn(this.caller, {
      persona,
      scenario,
      history,
      currentDistress,
      memories,
      isOpening: false,
      priorCallerCutOff: Boolean(opts.bargeIn),
    });

    let consecutive = this.consecutiveFallbacks.get(opts.sessionId) ?? 0;
    if (safetyFallback) consecutive += 1;
    else consecutive = 0;
    this.consecutiveFallbacks.set(opts.sessionId, consecutive);

    const { turn, clampInfo } = normalizeCallerTurn(raw, {
      previousDistress: currentDistress,
      isOpening: false,
      initialDistress: scenario.initialDistress,
      allowedWarningSigns: scenario.warningSignCodes,
    });

    let shouldEnd = turn.should_end_call;
    let line = turn.caller_line;
    if (consecutive >= 2) {
      shouldEnd = true;
      line =
        "The simulation ended early. You can review the call or start a new one.";
    }

    const callerSaved = await this.repo.appendTurn({
      sessionId: opts.sessionId,
      speaker: "caller",
      text: line,
      distress: turn.distress,
      trust: turn.trust,
      emotion: turn.emotion,
      revealedWarningSigns: turn.revealed_warning_signs,
      state: {
        raw: turn,
        clampInfo,
        safetyFallback,
        shouldEndCall: shouldEnd,
      },
      latencyMs: Date.now() - started,
    });

    return {
      traineeTurn: traineeTurnView(traineeTurn),
      callerTurn: callerTurnView(callerSaved),
      callEnded: shouldEnd,
    };
  }

  async endSession(sessionId: string): Promise<DebriefView> {
    const detail = await this.repo.getSession(sessionId);
    if (!detail) throw Object.assign(new Error("Session not found"), { status: 404 });
    if (detail.debrief) return detail.debrief;

    const { scenario, persona } = await this.repo.getScenarioWithPersona(
      detail.session.scenarioId,
    );

    let output: ScoringOutput;
    try {
      output = await this.scorer.score({
        persona,
        scenario,
        history: detail.turns,
      });
    } catch (err) {
      console.warn("[call] scoring failed:", (err as Error).message);
      throw Object.assign(new Error("Debrief unavailable, try again"), {
        status: 502,
        code: "SCORING_FAILED",
      });
    }

    const overall = computeOverallScore(output);
    await this.repo.completeSession(sessionId, output, overall);

    // Persist caller-POV facts for callbacks (local always; Backboard when enabled).
    const traineeLines = detail.turns
      .filter((t) => t.speaker === "trainee")
      .map((t) => t.text.trim())
      .filter(Boolean);
    const promiseLike = traineeLines.find(
      (t) =>
        /\b(try|call|reach out|check in|sister|plan|agree|promise|suggest)/i.test(
          t,
        ),
    );
    const facts = [
      promiseLike
        ? `The volunteer said: "${promiseLike.slice(0, 140)}"`
        : `On this call I talked about: ${scenario.title}.`,
      traineeLines[0]
        ? `Early on the volunteer asked or said: "${traineeLines[0].slice(0, 120)}"`
        : `I spoke with this volunteer about ${persona.name}'s situation.`,
      `My distress ended around ${
        detail.turns.filter((t) => t.speaker === "caller").at(-1)?.distress ?? "?"
      }.`,
      output.summary.slice(0, 180),
    ].filter(Boolean);
    await this.memory.remember(detail.session.traineeId, persona.id, facts);

    const updated = await this.repo.getSession(sessionId);
    if (!updated?.debrief) {
      return {
        skills: output.skills,
        warningSigns: output.warning_signs,
        askedDirectlyAboutSuicide: output.asked_directly_about_suicide,
        summary: output.summary,
        strengths: output.strengths,
        nextSteps: output.next_steps,
        overallScore: overall,
        distressCurve: detail.turns
          .filter((t) => t.speaker === "caller" && t.distress != null)
          .map((t) => ({ seq: t.seq, distress: t.distress! })),
      };
    }
    return updated.debrief;
  }

  async getAudioStream(sessionId: string, seq: number): Promise<{
    stream: NodeJS.ReadableStream;
    contentType: string;
  }> {
    const detail = await this.repo.getSession(sessionId);
    if (!detail) throw Object.assign(new Error("Session not found"), { status: 404 });
    const turn = detail.turns.find((t) => t.seq === seq && t.speaker === "caller");
    if (!turn) throw Object.assign(new Error("Caller turn not found"), { status: 404 });

    const { persona } = await this.repo.getScenarioWithPersona(
      detail.session.scenarioId,
    );
    const stream = await this.tts.stream(turn.text, {
      voiceId: persona.voiceId || config.elevenLabsDefaultVoiceId,
      distress: turn.distress ?? undefined,
      emotion: turn.emotion ?? undefined,
    });
    return { stream, contentType: "audio/mpeg" };
  }
}
