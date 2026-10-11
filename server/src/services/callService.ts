import type {
  CallMode,
  CallerRemembersView,
  CallerTurnView,
  DebriefView,
  ScoringOutput,
  SessionRecord,
  TurnView,
} from "../../../shared/types/index.js";
import type { CallerModel, Scorer } from "../ai/types.js";
import type { Repository } from "../db/types.js";
import { CompositeMemory } from "../memory/compositeMemory.js";
import type { CallerMemory } from "../memory/types.js";
import type { SpeechToText, TextToSpeech } from "../voice/types.js";
import { config } from "../config.js";
import { normalizeCallerTurn } from "./distress.js";
import { safeNextTurn } from "./safety.js";
import { computeOverallScore } from "./scoring.js";
import { callerTurnView, traineeTurnView } from "./views.js";

type StageTimer = {
  mark: (stage: string) => void;
  done: () => Record<string, number>;
};

function startTimer(): StageTimer {
  const t0 = Date.now();
  const marks: Record<string, number> = {};
  let last = t0;
  return {
    mark(stage: string) {
      const now = Date.now();
      marks[stage] = now - last;
      last = now;
    },
    done() {
      marks.total = Date.now() - t0;
      return marks;
    },
  };
}

function logTiming(label: string, marks: Record<string, number>): void {
  const parts = Object.entries(marks)
    .map(([k, v]) => `${k}=${v}ms`)
    .join(" ");
  console.info(`[call-timing] ${label} ${parts}`);
}

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

  /** Cached facts for this session — never hit Backboard mid-call. */
  private memoriesForSession(sessionId: string): string[] {
    return this.sessionMemories.get(sessionId)?.facts ?? [];
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
    const timer = startTimer();
    const { scenario, persona } = await this.repo.getScenarioWithPersona(
      opts.scenarioId,
    );
    timer.mark("scenario");

    // Prefetch memory in parallel with session create — hard-capped by CompositeMemory (~1s).
    const recallPromise = this.memory.recall(opts.traineeId, persona.id);
    const sessionPromise = this.repo.createSession({
      traineeId: opts.traineeId,
      scenarioId: opts.scenarioId,
      personaId: persona.id,
      mode: opts.mode,
    });

    const [memories, session] = await Promise.all([recallPromise, sessionPromise]);
    timer.mark("memory+session");

    const callerRemembers: CallerRemembersView = {
      facts: memories,
      source: memories.length ? this.memorySource() : "none",
    };
    this.sessionMemories.set(session.id, callerRemembers);

    const { turn: raw, safetyFallback } = await safeNextTurn(this.caller, {
      persona,
      scenario,
      history: [],
      currentDistress: scenario.initialDistress,
      memories,
      isOpening: true,
    });
    timer.mark("gemini");

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
      latencyMs: null,
    });
    timer.mark("db_write");
    const startMarks = timer.done();
    saved.latencyMs = startMarks.total ?? null;
    logTiming(`startSession ${session.id.slice(0, 8)}`, startMarks);

    return { session, openingTurn: callerTurnView(saved), callerRemembers };
  }

  async takeTurn(opts: {
    sessionId: string;
    text?: string;
    audio?: Buffer;
    mimeType?: string;
  }): Promise<{
    traineeTurn: TurnView;
    callerTurn: CallerTurnView;
    callEnded: boolean;
  }> {
    const timer = startTimer();
    const detail = await this.repo.getSession(opts.sessionId);
    if (!detail) throw Object.assign(new Error("Session not found"), { status: 404 });
    if (detail.session.status !== "in_progress") {
      throw Object.assign(new Error("Session is not in progress"), { status: 409 });
    }
    timer.mark("load_session");

    let traineeText = opts.text?.trim() ?? "";
    if (!traineeText && opts.audio) {
      try {
        traineeText = await this.stt.transcribe(
          opts.audio,
          opts.mimeType ?? "audio/webm",
        );
        timer.mark("stt");
      } catch (err) {
        console.warn("[call] STT failed, need text fallback:", (err as Error).message);
        throw Object.assign(new Error("Speech recognition failed; try text input"), {
          status: 502,
          code: "STT_FAILED",
        });
      }
    } else {
      timer.mark("stt");
    }
    if (!traineeText) {
      throw Object.assign(new Error("text or audio required"), { status: 400 });
    }

    // Scenario + trainee DB write in parallel (no Backboard on critical path).
    const scenarioPromise = this.repo.getScenarioWithPersona(
      detail.session.scenarioId,
    );
    const traineeWritePromise = this.repo.appendTurn({
      sessionId: opts.sessionId,
      speaker: "trainee",
      text: traineeText,
      latencyMs: null,
    });

    const [{ scenario, persona }, traineeTurn] = await Promise.all([
      scenarioPromise,
      traineeWritePromise,
    ]);
    timer.mark("db_trainee+scenario");

    const history = [...detail.turns, traineeTurn];
    const lastCaller = [...detail.turns]
      .reverse()
      .find((t) => t.speaker === "caller");
    const currentDistress = lastCaller?.distress ?? scenario.initialDistress;
    // Prefetched at call start — never await Backboard mid-turn.
    const memories = this.memoriesForSession(opts.sessionId);
    timer.mark("memory_cache");

    const { turn: raw, safetyFallback } = await safeNextTurn(this.caller, {
      persona,
      scenario,
      history,
      currentDistress,
      memories,
      isOpening: false,
    });
    timer.mark("gemini");

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
      latencyMs: null,
    });
    timer.mark("db_caller");
    const turnMarks = timer.done();
    // Stamp latency after write using measured total.
    callerSaved.latencyMs = turnMarks.total ?? null;
    logTiming(`takeTurn ${opts.sessionId.slice(0, 8)}`, turnMarks);

    // Kick TTS warm-up off the critical path (audio fetched via separate GET).
    void this.tts;

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

    // Persist caller-POV facts for callbacks (local await; Backboard fire-and-forget).
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

    // Don't block debrief on Backboard — CompositeMemory remembers locally then FF primary.
    void this.memory
      .remember(detail.session.traineeId, persona.id, facts)
      .catch((err) =>
        console.warn("[call] memory.remember failed:", (err as Error).message),
      );

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
