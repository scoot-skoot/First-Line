import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ConversationProvider,
  useConversation,
} from "@elevenlabs/react";
import type { Emotion, SessionRecord, TurnView } from "@shared";
import { DistressMeter } from "../../components/DistressMeter";
import { Transcript } from "../../components/Transcript";
import { duplexApi, type DuplexStartResponse } from "./api";

const EMOTIONS: Emotion[] = [
  "calm",
  "anxious",
  "tearful",
  "irritated",
  "angry",
  "flat",
  "relieved",
];

function parseEmotion(raw: unknown): Emotion {
  return typeof raw === "string" && (EMOTIONS as string[]).includes(raw)
    ? (raw as Emotion)
    : "anxious";
}

/**
 * Full-duplex call UI using @elevenlabs/react ConversationProvider.
 * Enabled only when server CALL_MODE=duplex. PTT Call page stays default.
 */
export function DuplexCall() {
  return (
    <ConversationProvider>
      <DuplexCallInner />
    </ConversationProvider>
  );
}

function DuplexCallInner() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [turns, setTurns] = useState<TurnView[]>([]);
  const [boot, setBoot] = useState<DuplexStartResponse | null>(null);
  const [liveDistress, setLiveDistress] = useState<number | null>(null);
  const [liveTrust, setLiveTrust] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [started, setStarted] = useState(false);
  const [agentMode, setAgentMode] = useState<"speaking" | "listening" | "idle">(
    "idle",
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef(id);
  const lastPersisted = useRef<string>("");
  const bootRef = useRef<DuplexStartResponse | null>(null);

  useEffect(() => {
    sessionIdRef.current = id;
  }, [id]);

  const persistMessage = useCallback(
    async (speaker: "trainee" | "caller", text: string) => {
      const sid = sessionIdRef.current;
      if (!sid || !text.trim()) return;
      const key = `${speaker}:${text.trim()}`;
      if (key === lastPersisted.current) return;
      lastPersisted.current = key;
      try {
        const { turn } = await duplexApi.appendTurn(sid, {
          speaker,
          text: text.trim(),
          source: "elevenlabs_onMessage",
        });
        setTurns((prev) => {
          const dup = prev.some(
            (t) => t.speaker === turn.speaker && t.text === turn.text && t.seq === turn.seq,
          );
          if (dup) return prev;
          // Avoid near-dupes from tentative transcripts
          const near = prev.at(-1);
          if (
            near &&
            near.speaker === turn.speaker &&
            near.text.trim() === turn.text.trim()
          ) {
            return prev;
          }
          return [...prev, turn];
        });
      } catch (e) {
        console.warn("[duplex] persist turn failed", e);
      }
    },
    [],
  );

  const reportCallerState = useCallback(
    async (params: Record<string, unknown>) => {
      const sid = sessionIdRef.current;
      if (!sid) return "no session";
      try {
        const result = await duplexApi.reportState(sid, {
          distress: Number(params.distress ?? 50),
          trust: Number(params.trust ?? 30),
          emotion: parseEmotion(params.emotion),
          revealed_warning_signs: Array.isArray(params.revealed_warning_signs)
            ? (params.revealed_warning_signs as string[])
            : [],
          should_end_call: Boolean(params.should_end_call),
          caller_line:
            typeof params.caller_line === "string"
              ? params.caller_line
              : undefined,
        });
        setLiveDistress(result.distress);
        setLiveTrust(result.trust);
        if (result.turn) {
          setTurns((prev) => {
            const near = prev.at(-1);
            if (
              near &&
              near.speaker === "caller" &&
              near.text.trim() === (result.turn?.text ?? "").trim()
            ) {
              return prev.map((t, i) =>
                i === prev.length - 1
                  ? {
                      ...t,
                      distress: result.distress,
                      trust: result.trust,
                      emotion: result.turn?.emotion ?? t.emotion,
                    }
                  : t,
              );
            }
            return [...prev, result.turn!];
          });
        } else {
          setTurns((prev) => {
            const idx = [...prev]
              .map((t, i) => ({ t, i }))
              .reverse()
              .find((x) => x.t.speaker === "caller")?.i;
            if (idx == null) return prev;
            return prev.map((t, i) =>
              i === idx
                ? { ...t, distress: result.distress, trust: result.trust }
                : t,
            );
          });
        }
        if (result.callEnded) setCallEnded(true);
        return `ok distress=${result.distress}`;
      } catch (e) {
        console.warn("[duplex] reportCallerState failed", e);
        return `error: ${(e as Error).message}`;
      }
    },
    [],
  );

  const conversation = useConversation({
    onConnect: () => {
      setConnecting(false);
      setStarted(true);
      setToast(null);
    },
    onDisconnect: () => {
      setStarted(false);
      setAgentMode("idle");
    },
    onError: (message) => {
      setConnecting(false);
      setToast(typeof message === "string" ? message : "Duplex session error");
    },
    onModeChange: ({ mode }) => {
      setAgentMode(mode === "speaking" ? "speaking" : "listening");
    },
    onMessage: ({ message, role }) => {
      const text = (message ?? "").trim();
      if (!text) return;
      const speaker = role === "user" ? "trainee" : "caller";
      void persistMessage(speaker, text);
    },
    onInterruption: () => {
      setAgentMode("listening");
    },
    clientTools: {
      reportCallerState,
    },
  });

  // Load existing session if navigated with id only (after start already created it).
  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const status = await duplexApi.status();
        if (!status.duplexEnabled) {
          setToast("Server CALL_MODE is not duplex — switch back to PTT Call UI.");
          return;
        }
        // Session was created by Home via duplex start; hydrate transcript.
        const base = import.meta.env.VITE_API_URL ?? "";
        const res = await fetch(`${base}/api/sessions/${id}`);
        if (!res.ok) throw new Error("Session not found");
        const data = (await res.json()) as {
          session: SessionRecord;
          turns: TurnView[];
        };
        setSession(data.session);
        setTurns(data.turns);
        const last = [...data.turns].reverse().find((t) => t.speaker === "caller");
        if (last?.distress != null) setLiveDistress(last.distress);
        if (data.session.status !== "in_progress") setCallEnded(true);
      } catch (e) {
        setToast((e as Error).message);
      }
    })();
  }, [id]);

  async function connectVoice() {
    if (!id || connecting || started || callEnded) return;
    setConnecting(true);
    setToast(null);
    try {
      const cached = bootRef.current ?? readBootCache(id);
      if (!cached) {
        setToast(
          "Missing duplex bootstrap. Start the call from the dispatch board again.",
        );
        setConnecting(false);
        return;
      }

      // Signed URLs / tokens expire ~15 min — refresh right before connect.
      const fresh = await duplexApi.refreshCredentials(id);
      const payload: DuplexStartResponse = {
        ...cached,
        ...fresh,
        connectionType: fresh.connectionType,
      };
      setBoot(payload);
      bootRef.current = payload;
      stashDuplexBoot(id, payload);

      await navigator.mediaDevices.getUserMedia({ audio: true });

      const overrides = payload.overrides;
      const common = {
        overrides,
        customLlmExtraBody: payload.customLlmExtraBody,
        connectionType: payload.connectionType,
      } as const;

      if (payload.connectionType === "websocket" && payload.signedUrl) {
        conversation.startSession({
          ...common,
          signedUrl: payload.signedUrl,
          connectionType: "websocket",
        });
      } else if (payload.conversationToken) {
        conversation.startSession({
          ...common,
          conversationToken: payload.conversationToken,
          connectionType: "webrtc",
        });
      } else {
        conversation.startSession({
          ...common,
          agentId: payload.agentId,
        });
      }
    } catch (e) {
      setConnecting(false);
      setToast((e as Error).message);
    }
  }

  async function endAndDebrief() {
    setEnding(true);
    setToast(null);
    try {
      try {
        conversation.endSession();
      } catch {
        /* ignore */
      }
      await duplexApi.endSession(id);
      clearBootCache(id);
      navigate(`/debrief/${id}`);
    } catch (e) {
      setToast((e as Error).message || "Debrief unavailable, try again.");
      setEnding(false);
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const callerTurns = useMemo(
    () => turns.filter((t) => t.speaker === "caller"),
    [turns],
  );
  const latestCaller = callerTurns.at(-1);
  const distress = liveDistress ?? latestCaller?.distress ?? 0;
  const prevDistress =
    callerTurns.length >= 2 ? (callerTurns.at(-2)?.distress ?? null) : null;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col gap-4 px-4 py-6 lg:flex-row">
      <section className="flex min-h-[50vh] flex-1 flex-col rounded-sm border border-line bg-console-900/50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-signal">
              Duplex call · ElevenLabs Agents · Training only
            </p>
            <h1 className="text-xl font-semibold text-ink">
              Session {session ? session.id.slice(0, 8) : id.slice(0, 8) || "…"}
            </h1>
            <p className="mt-1 font-mono text-xs text-ink-muted">
              status={conversation.status}
              {started ? ` · agent ${agentMode}` : ""}
              {liveTrust != null ? ` · trust ${liveTrust}` : ""}
              {boot ? ` · ${boot.llmMode}/${boot.connectionType}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/"
              className="border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
            >
              Queue
            </Link>
          </div>
        </div>

        <div className="mb-3 border border-line/80 bg-console-950/40 px-3 py-2 text-sm text-ink-muted">
          Speak naturally — both sides can barge in. Mic stays open while
          connected. This is a training simulator, not a real crisis line.
        </div>

        <Transcript turns={turns} bottomRef={bottomRef} />

        {callEnded && (
          <p className="mt-3 text-sm text-amber">
            Caller signaled end — ready for debrief when you are.
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          {!started ? (
            <button
              type="button"
              disabled={connecting || callEnded}
              onClick={() => void connectVoice()}
              className="bg-signal px-4 py-2 text-sm font-semibold text-console-950 disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect mic (full-duplex)"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => conversation.endSession()}
              className="border border-line px-4 py-2 text-sm text-ink hover:border-amber"
            >
              Disconnect mic
            </button>
          )}
          <button
            type="button"
            disabled={ending}
            onClick={() => void endAndDebrief()}
            className="ml-auto bg-signal px-4 py-2 text-sm font-semibold text-console-950 disabled:opacity-50"
          >
            {ending ? "Scoring…" : "End & debrief"}
          </button>
          {toast && <p className="w-full text-sm text-amber">{toast}</p>}
        </div>
      </section>

      <aside className="w-full shrink-0 space-y-4 lg:w-80">
        <DistressMeter
          distress={distress}
          previous={prevDistress}
          history={callerTurns}
        />
        <div className="border border-line bg-console-900/50 p-4 text-sm text-ink-muted">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            Duplex notes
          </p>
          <p className="mt-2 leading-relaxed">
            Interruptions are intentional. Validate, ask open questions, and when
            cues appear ask directly about suicide. Distress updates via the
            agent&apos;s <code className="text-signal">reportCallerState</code>{" "}
            client tool.
          </p>
        </div>
      </aside>
    </div>
  );
}

const BOOT_PREFIX = "firstline.duplex.boot.";

export function stashDuplexBoot(sessionId: string, boot: DuplexStartResponse) {
  try {
    sessionStorage.setItem(BOOT_PREFIX + sessionId, JSON.stringify(boot));
  } catch {
    /* ignore quota */
  }
}

function readBootCache(sessionId: string): DuplexStartResponse | null {
  try {
    const raw = sessionStorage.getItem(BOOT_PREFIX + sessionId);
    if (!raw) return null;
    return JSON.parse(raw) as DuplexStartResponse;
  } catch {
    return null;
  }
}

function clearBootCache(sessionId: string) {
  try {
    sessionStorage.removeItem(BOOT_PREFIX + sessionId);
  } catch {
    /* ignore */
  }
}
