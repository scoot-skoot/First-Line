import type {
  CallMode,
  CallerTurnView,
  DebriefView,
  ScoringOutput,
  SessionRecord,
  TurnView,
} from "../../../shared/types/index.js";
import type { CallerModel, Scorer } from "../ai/types.js";
import type { Repository } from "../db/types.js";
import type { CallerMemory } from "../memory/types.js";
import type { SpeechToText, TextToSpeech } from "../voice/types.js";
import { config } from "../config.js";
import { normalizeCallerTurn } from "./distress.js";
import { safeNextTurn } from "./safety.js";
import { computeOverallScore } from "./scoring.js";
import { callerTurnView, traineeTurnView } from "./views.js";

export class CallService {
  private consecutiveFallbacks = new Map<string, number>();

  constructor(
    private repo: Repository,
    private caller: CallerModel,
    private scorer: Scorer,
    private memory: CallerMemory,
    private stt: SpeechToText,
    private tts: TextToSpeech,
  ) {}

  async startSession(opts: {
    traineeId: string;
    scenarioId: string;
    mode: CallMode;
  }): Promise<{ session: SessionRecord; openingTurn: CallerTurnView }> {
    const { scenario, persona } = await this.repo.getScenarioWithPersona(
      opts.scenarioId,
    );
    const memories = await this.memory.recall(opts.traineeId, persona.id);
    const session = await this.repo.createSession({
      traineeId: opts.traineeId,
      scenarioId: opts.scenarioId,
      personaId: persona.id,
      mode: opts.mode,
    });

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
      },
      latencyMs: Date.now() - started,
    });

    // Warm TTS cache path (audio served on GET)
    void this.tts;

    return { session, openingTurn: callerTurnView(saved) };
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
      latencyMs: null,
    });

    const { scenario, persona } = await this.repo.getScenarioWithPersona(
      detail.session.scenarioId,
    );
    const history = [...detail.turns, traineeTurn];
    const lastCaller = [...detail.turns]
      .reverse()
      .find((t) => t.speaker === "caller");
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

    // E1 memory write (noop when MEMORY_PROVIDER=none)
    const facts = [
      `On this call I talked about: ${scenario.title}.`,
      `My distress moved across the call; final mood was around ${
        detail.turns.filter((t) => t.speaker === "caller").at(-1)?.distress ?? "?"
      }.`,
      output.summary.slice(0, 200),
    ];
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
