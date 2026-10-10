import type {
  CallerRemembersView,
  CallerTurnView,
  Emotion,
  SessionRecord,
  TurnView,
} from "../../../shared/types/index.js";
import type { CallerModel } from "../ai/types.js";
import { config } from "../config.js";
import type { Repository } from "../db/types.js";
import { CompositeMemory } from "../memory/compositeMemory.js";
import type { CallerMemory } from "../memory/types.js";
import { normalizeCallerTurn } from "../services/distress.js";
import { safeNextTurn } from "../services/safety.js";
import { callerTurnView, traineeTurnView } from "../services/views.js";
import { CallService } from "../services/callService.js";
import { buildDuplexAgentPrompt } from "./prompt.js";
import {
  fetchConversationToken,
  fetchSignedUrl,
} from "./elevenlabsConvai.js";

export type DuplexConnectionType = "webrtc" | "websocket";
export type DuplexLlmMode = "overrides" | "custom";

export interface DuplexOverrides {
  agent: {
    prompt: { prompt: string };
    firstMessage: string;
    language: "en";
  };
  tts: { voiceId: string };
}

export interface DuplexStartResult {
  session: SessionRecord;
  openingTurn: CallerTurnView | null;
  callerRemembers: CallerRemembersView;
  agentId: string;
  connectionType: DuplexConnectionType;
  llmMode: DuplexLlmMode;
  /** WebSocket private agents — from get-signed-url */
  signedUrl?: string;
  /** WebRTC private agents — from conversation/token */
  conversationToken?: string;
  conversationId?: string;
  overrides: DuplexOverrides;
  /** Passed to ElevenLabs as customLlmExtraBody when llmMode=custom */
  customLlmExtraBody: { sessionId: string };
  /** Client tool names the agent dashboard must define */
  clientTools: string[];
}

/**
 * Full-duplex session orchestration for ElevenLabs Agents.
 * Default path (overrides): persona injected via conversation overrides +
 * reportCallerState client tool; no public URL required.
 * Optional path (custom): Gemini behind OpenAI-compatible /v1/chat/completions.
 */
export class DuplexService {
  private sessionMemories = new Map<string, CallerRemembersView>();
  /** Latest distress per duplex session (for custom LLM continuity). */
  private distressBySession = new Map<string, number>();

  constructor(
    private repo: Repository,
    private caller: CallerModel,
    private memory: CallerMemory,
    private calls: CallService,
  ) {}

  private memorySource(): CallerRemembersView["source"] {
    if (this.memory instanceof CompositeMemory) return this.memory.lastSource;
    return config.memoryProvider === "backboard" ? "backboard" : "session_history";
  }

  getCallerRemembers(sessionId: string): CallerRemembersView | null {
    return this.sessionMemories.get(sessionId) ?? null;
  }

  getDistress(sessionId: string): number | undefined {
    return this.distressBySession.get(sessionId);
  }

  async startSession(opts: {
    traineeId: string;
    scenarioId: string;
  }): Promise<DuplexStartResult> {
    if (config.callMode !== "duplex") {
      throw Object.assign(new Error("CALL_MODE is not duplex"), {
        status: 409,
        code: "DUPLEX_DISABLED",
      });
    }
    const agentId = config.elevenLabsAgentId;
    if (!agentId) {
      throw Object.assign(
        new Error("ELEVENLABS_AGENT_ID required for duplex mode"),
        { status: 503, code: "MISSING_AGENT_ID" },
      );
    }
    if (!config.elevenLabsApiKey) {
      throw Object.assign(new Error("ELEVENLABS_API_KEY required for duplex"), {
        status: 503,
        code: "MISSING_ELEVENLABS_KEY",
      });
    }

    const { scenario, persona } = await this.repo.getScenarioWithPersona(
      opts.scenarioId,
    );
    const memories = await this.memory.recall(opts.traineeId, persona.id);
    const callerRemembers: CallerRemembersView = {
      facts: memories,
      source: memories.length ? this.memorySource() : "none",
    };

    // Store as voice so existing DB CHECK (text|voice) stays valid; duplex is CALL_MODE transport.
    const session = await this.repo.createSession({
      traineeId: opts.traineeId,
      scenarioId: opts.scenarioId,
      personaId: persona.id,
      mode: "voice",
    });
    this.sessionMemories.set(session.id, callerRemembers);
    this.distressBySession.set(session.id, scenario.initialDistress);

    const withStateTool = config.duplexLlmMode === "overrides";
    const prompt = buildDuplexAgentPrompt({
      persona,
      scenario,
      memories,
      currentDistress: scenario.initialDistress,
      withStateTool,
    });

    // Generate opening line via our Gemini/mock caller so firstMessage matches persona.
    let openingTurn: CallerTurnView | null = null;
    let firstMessage =
      "Hi… thanks for picking up. I've been having a really hard time.";
    try {
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
      firstMessage = turn.caller_line;
      this.distressBySession.set(session.id, turn.distress);
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
          duplex: true,
          source: "opening",
        },
        latencyMs: Date.now() - started,
      });
      openingTurn = callerTurnView(saved);
    } catch (err) {
      console.warn(
        "[duplex] opening generation failed, using fallback firstMessage:",
        (err as Error).message,
      );
    }

    const voiceId =
      persona.voiceId ?? config.elevenLabsDefaultVoiceId ?? "EXAVITQu4vr4xnSDxMaL";

    const overrides: DuplexOverrides = {
      agent: {
        prompt: { prompt },
        firstMessage,
        language: "en",
      },
      tts: { voiceId },
    };

    const connectionType = config.duplexConnection;
    let signedUrl: string | undefined;
    let conversationToken: string | undefined;
    let conversationId: string | undefined;

    if (connectionType === "websocket") {
      signedUrl = await fetchSignedUrl(agentId);
    } else {
      const tok = await fetchConversationToken(agentId);
      conversationToken = tok.token;
      conversationId = tok.conversationId;
    }

    return {
      session,
      openingTurn,
      callerRemembers,
      agentId,
      connectionType,
      llmMode: config.duplexLlmMode,
      signedUrl,
      conversationToken,
      conversationId,
      overrides,
      customLlmExtraBody: { sessionId: session.id },
      clientTools: withStateTool ? ["reportCallerState"] : [],
    };
  }

  async appendTranscriptTurn(opts: {
    sessionId: string;
    speaker: "trainee" | "caller";
    text: string;
    source?: string;
  }): Promise<TurnView> {
    const detail = await this.repo.getSession(opts.sessionId);
    if (!detail) {
      throw Object.assign(new Error("Session not found"), { status: 404 });
    }
    if (detail.session.status !== "in_progress") {
      throw Object.assign(new Error("Session is not in progress"), { status: 409 });
    }
    const text = opts.text.trim();
    if (!text) {
      throw Object.assign(new Error("text required"), { status: 400 });
    }

    // Dedupe identical consecutive same-speaker lines (SDK can emit tentative + final).
    const last = detail.turns.at(-1);
    if (
      last &&
      last.speaker === opts.speaker &&
      last.text.trim() === text &&
      (last.state as { duplex?: boolean } | null)?.duplex
    ) {
      return opts.speaker === "caller"
        ? callerTurnView(last)
        : traineeTurnView(last);
    }

    const distress = this.distressBySession.get(opts.sessionId) ?? null;
    const saved = await this.repo.appendTurn({
      sessionId: opts.sessionId,
      speaker: opts.speaker,
      text,
      distress: opts.speaker === "caller" ? distress : null,
      trust: null,
      emotion: null,
      revealedWarningSigns: [],
      state: { duplex: true, source: opts.source ?? "transcript" },
      latencyMs: null,
    });
    return opts.speaker === "caller"
      ? callerTurnView(saved)
      : traineeTurnView(saved);
  }

  async reportCallerState(opts: {
    sessionId: string;
    distress: number;
    trust: number;
    emotion: Emotion;
    revealed_warning_signs?: string[];
    should_end_call?: boolean;
    /** Optional spoken line if the client also captured it */
    caller_line?: string;
  }): Promise<{
    turn: CallerTurnView | null;
    distress: number;
    trust: number;
    callEnded: boolean;
  }> {
    const detail = await this.repo.getSession(opts.sessionId);
    if (!detail) {
      throw Object.assign(new Error("Session not found"), { status: 404 });
    }
    if (detail.session.status !== "in_progress") {
      throw Object.assign(new Error("Session is not in progress"), { status: 409 });
    }

    const { scenario } = await this.repo.getScenarioWithPersona(
      detail.session.scenarioId,
    );
    const previous =
      this.distressBySession.get(opts.sessionId) ??
      detail.turns
        .filter((t) => t.speaker === "caller" && t.distress != null)
        .at(-1)?.distress ??
      scenario.initialDistress;

    const { turn, clampInfo } = normalizeCallerTurn(
      {
        caller_line: opts.caller_line?.trim() || "[state update]",
        emotion: opts.emotion,
        distress: opts.distress,
        trust: opts.trust,
        revealed_warning_signs: opts.revealed_warning_signs ?? [],
        should_end_call: opts.should_end_call ?? false,
      },
      {
        previousDistress: previous,
        isOpening: false,
        initialDistress: scenario.initialDistress,
        allowedWarningSigns: scenario.warningSignCodes,
      },
    );

    this.distressBySession.set(opts.sessionId, turn.distress);

    let savedTurn: CallerTurnView | null = null;
    // Transcript lines are usually persisted via /turns from the browser onMessage.
    // Only append here when the client also sends the spoken caller_line.
    if (opts.caller_line?.trim()) {
      const saved = await this.repo.appendTurn({
        sessionId: opts.sessionId,
        speaker: "caller",
        text: turn.caller_line,
        distress: turn.distress,
        trust: turn.trust,
        emotion: turn.emotion,
        revealedWarningSigns: turn.revealed_warning_signs,
        state: {
          raw: turn,
          clampInfo,
          shouldEndCall: turn.should_end_call,
          duplex: true,
          source: "reportCallerState",
        },
        latencyMs: null,
      });
      savedTurn = callerTurnView(saved);
    } else {
      // Attach clamped state onto the latest caller turn by appending a state-bearing
      // duplicate only when the last caller row has no distress yet (opening edge case).
      const lastCaller = [...detail.turns]
        .reverse()
        .find((t) => t.speaker === "caller");
      if (lastCaller && lastCaller.distress == null) {
        const saved = await this.repo.appendTurn({
          sessionId: opts.sessionId,
          speaker: "caller",
          text: lastCaller.text,
          distress: turn.distress,
          trust: turn.trust,
          emotion: turn.emotion,
          revealedWarningSigns: turn.revealed_warning_signs,
          state: {
            raw: turn,
            clampInfo,
            shouldEndCall: turn.should_end_call,
            duplex: true,
            source: "reportCallerState",
            stateOnly: true,
          },
          latencyMs: null,
        });
        savedTurn = callerTurnView(saved);
      } else if (lastCaller) {
        savedTurn = {
          ...callerTurnView(lastCaller),
          distress: turn.distress,
          trust: turn.trust,
          emotion: turn.emotion,
          revealedWarningSigns: turn.revealed_warning_signs,
        };
      }
    }

    return {
      turn: savedTurn,
      distress: turn.distress,
      trust: turn.trust,
      callEnded: turn.should_end_call,
    };
  }

  /**
   * Used by the custom LLM endpoint: persist trainee utterance + Gemini caller reply,
   * return the spoken caller_line for SSE streaming to ElevenLabs.
   */
  async generateCallerLineForCustomLlm(opts: {
    sessionId: string;
    traineeText: string;
  }): Promise<{ callerLine: string; shouldEndCall: boolean }> {
    const detail = await this.repo.getSession(opts.sessionId);
    if (!detail) {
      throw Object.assign(new Error("Session not found"), { status: 404 });
    }
    if (detail.session.status !== "in_progress") {
      throw Object.assign(new Error("Session is not in progress"), { status: 409 });
    }

    const { scenario, persona } = await this.repo.getScenarioWithPersona(
      detail.session.scenarioId,
    );
    const memories =
      this.sessionMemories.get(opts.sessionId)?.facts ??
      (await this.memory.recall(detail.session.traineeId, persona.id));

    const traineeText = opts.traineeText.trim();
    if (traineeText) {
      await this.repo.appendTurn({
        sessionId: opts.sessionId,
        speaker: "trainee",
        text: traineeText,
        state: { duplex: true, source: "custom_llm" },
        latencyMs: null,
      });
    }

    const previous =
      this.distressBySession.get(opts.sessionId) ?? scenario.initialDistress;
    const history = (await this.repo.getSession(opts.sessionId))!.turns;

    const started = Date.now();
    const { turn: raw, safetyFallback } = await safeNextTurn(this.caller, {
      persona,
      scenario,
      history,
      currentDistress: previous,
      memories,
      isOpening: false,
    });
    const { turn, clampInfo } = normalizeCallerTurn(raw, {
      previousDistress: previous,
      isOpening: false,
      initialDistress: scenario.initialDistress,
      allowedWarningSigns: scenario.warningSignCodes,
    });
    this.distressBySession.set(opts.sessionId, turn.distress);

    await this.repo.appendTurn({
      sessionId: opts.sessionId,
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
        duplex: true,
        source: "custom_llm",
      },
      latencyMs: Date.now() - started,
    });

    return {
      callerLine: turn.caller_line,
      shouldEndCall: turn.should_end_call,
    };
  }

  endSession(sessionId: string) {
    return this.calls.endSession(sessionId);
  }

  /** Refresh signed URL / conversation token for an existing duplex session. */
  async refreshCredentials(sessionId: string): Promise<{
    connectionType: DuplexConnectionType;
    signedUrl?: string;
    conversationToken?: string;
    conversationId?: string;
    agentId: string;
  }> {
    const agentId = config.elevenLabsAgentId;
    if (!agentId) {
      throw Object.assign(new Error("ELEVENLABS_AGENT_ID required"), {
        status: 503,
        code: "MISSING_AGENT_ID",
      });
    }
    const detail = await this.repo.getSession(sessionId);
    if (!detail) {
      throw Object.assign(new Error("Session not found"), { status: 404 });
    }
    const connectionType = config.duplexConnection;
    if (connectionType === "websocket") {
      return {
        connectionType,
        agentId,
        signedUrl: await fetchSignedUrl(agentId),
      };
    }
    const tok = await fetchConversationToken(agentId);
    return {
      connectionType,
      agentId,
      conversationToken: tok.token,
      conversationId: tok.conversationId,
    };
  }
}
