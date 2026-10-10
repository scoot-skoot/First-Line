import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { SessionRecord, TurnView } from "@shared";
import { api } from "../api/client";
import { DistressMeter } from "../components/DistressMeter";
import { PushToTalkButton } from "../components/PushToTalkButton";
import { Transcript } from "../components/Transcript";
import {
  mergeInterruptionTurns,
  useCallerInterruptions,
} from "../features/interruptions/useCallerInterruptions";

export function Call() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [turns, setTurns] = useState<TurnView[]>([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const callerTurns = useMemo(
    () => turns.filter((t) => t.speaker === "caller"),
    [turns],
  );
  const latestCaller = callerTurns.at(-1);
  const prevDistress =
    callerTurns.length >= 2
      ? (callerTurns.at(-2)?.distress ?? null)
      : null;

  const playAudio = useCallback(
    (seq: number) => {
      if (pausedRef.current) return;
      const url = api.audioUrl(id, seq);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      void audio.play().catch(() => {
        // Autoplay often blocked until a user gesture; transcript remains primary.
      });
    },
    [id],
  );

  const interruptions = useCallerInterruptions({
    sessionId: id,
    enabled: Boolean(id) && mode === "voice",
    paused,
    callEnded,
    busy,
    currentDistress: latestCaller?.distress ?? 50,
    latestCallerSeq: latestCaller?.seq ?? null,
    audioRef,
    onInterrupted: (result) => {
      setTurns((t) => mergeInterruptionTurns(t, result));
      if (result.callerTurn.audioUrl) playAudio(result.callerTurn.seq);
      if (result.callEnded) setCallEnded(true);
    },
    onError: (message) => setToast(message),
  });

  useEffect(() => {
    void (async () => {
      const data = await api.getSession(id);
      setSession(data.session);
      setTurns(data.turns);
      setMode(data.session.mode);
      if (data.session.status !== "in_progress") setCallEnded(true);
      const opening = data.turns.find((t) => t.speaker === "caller");
      if (opening?.audioUrl) playAudio(opening.seq);
    })().catch((e) => setToast((e as Error).message));
  }, [id, playAudio]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function sendText(value: string) {
    if (!value.trim() || busy || paused || callEnded) return;
    setBusy(true);
    setToast(null);
    interruptions.noteActivity();
    try {
      const res = await api.postTextTurn(id, value.trim());
      setTurns((t) => [...t, res.traineeTurn, res.callerTurn]);
      setText("");
      if (res.callerTurn.audioUrl) playAudio(res.callerTurn.seq);
      if (res.callEnded) setCallEnded(true);
      interruptions.noteActivity();
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendAudio(blob: Blob) {
    if (busy || paused || callEnded) return;
    setBusy(true);
    setToast(null);
    interruptions.noteActivity();
    try {
      const res = await api.postAudioTurn(id, blob, {
        bargeIn: interruptions.pendingBargeIn,
        bargeInFromSeq: interruptions.pendingBargeInFromSeq,
      });
      interruptions.clearBargeIn();
      setTurns((t) => [...t, res.traineeTurn, res.callerTurn]);
      if (res.callerTurn.audioUrl) playAudio(res.callerTurn.seq);
      if (res.callEnded) setCallEnded(true);
      interruptions.noteActivity();
    } catch (e) {
      setToast(`${(e as Error).message} — try typing instead.`);
      setMode("text");
    } finally {
      setBusy(false);
    }
  }

  async function endAndDebrief() {
    setEnding(true);
    setToast(null);
    try {
      await api.endSession(id);
      navigate(`/debrief/${id}`);
    } catch (e) {
      setToast((e as Error).message || "Debrief unavailable, try again.");
      setEnding(false);
    }
  }

  function togglePause() {
    setPaused((p) => {
      const next = !p;
      if (next) audioRef.current?.pause();
      return next;
    });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col gap-4 px-4 py-6 lg:flex-row">
      <section className="flex min-h-[50vh] flex-1 flex-col rounded-sm border border-line bg-console-900/50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-signal">
              Live call · Training simulator only
            </p>
            <h1 className="text-xl font-semibold text-ink">
              Session {session ? session.id.slice(0, 8) : "…"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={togglePause}
              className="border border-line px-3 py-1.5 text-sm text-ink hover:border-amber"
            >
              {paused ? "Resume" : "Pause / I need a break"}
            </button>
            <Link
              to="/"
              className="border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
            >
              Queue
            </Link>
          </div>
        </div>

        {paused && (
          <div className="mb-3 border border-amber/40 bg-amber/10 px-3 py-3 text-sm text-ink">
            Simulation paused. Take a breath. If you need support yourself, call
            or text <strong>988</strong>.
          </div>
        )}

        <Transcript turns={turns} bottomRef={bottomRef} />

        {callEnded && (
          <p className="mt-3 text-sm text-amber">
            Caller ended the call — ready for debrief when you are.
          </p>
        )}

        <form
          className="mt-4 flex flex-col gap-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void sendText(text);
          }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-sm border border-line text-sm">
              <button
                type="button"
                className={`px-3 py-1.5 ${mode === "text" ? "bg-console-700 text-ink" : "text-ink-muted"}`}
                onClick={() => setMode("text")}
              >
                Text
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 ${mode === "voice" ? "bg-console-700 text-ink" : "text-ink-muted"}`}
                onClick={() => setMode("voice")}
              >
                Voice
              </button>
            </div>
            {mode === "voice" && (
              <PushToTalkButton
                disabled={busy || paused || callEnded}
                onClip={sendAudio}
                maxHoldMs={interruptions.pttHoldMs}
                onMaxHold={interruptions.onPttMaxHold}
                onRecordingStart={interruptions.onPttStart}
                onRecordingEnd={interruptions.onPttEnd}
              />
            )}
            <button
              type="button"
              disabled={ending || busy}
              onClick={() => void endAndDebrief()}
              className="ml-auto bg-signal px-4 py-2 text-sm font-semibold text-console-950 disabled:opacity-50"
            >
              {ending ? "Scoring…" : "End & debrief"}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy || paused || callEnded}
              placeholder="Type a response (always available)…"
              className="flex-1 border border-line bg-console-950 px-3 py-2 text-ink outline-none placeholder:text-ink-muted focus:border-signal/50"
            />
            <button
              type="submit"
              disabled={busy || paused || callEnded || !text.trim()}
              className="border border-line px-4 py-2 text-sm font-medium text-ink hover:border-signal/50 disabled:opacity-40"
            >
              Send
            </button>
          </div>
          {toast && <p className="text-sm text-amber">{toast}</p>}
        </form>
      </section>

      <aside className="w-full shrink-0 space-y-4 lg:w-80">
        <DistressMeter
          distress={latestCaller?.distress ?? 0}
          previous={prevDistress}
          history={callerTurns}
        />
        <div className="border border-line bg-console-900/50 p-4 text-sm text-ink-muted">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            Operator notes
          </p>
          <p className="mt-2 leading-relaxed">
            Validate feelings, ask open questions, and when cues appear ask
            directly about suicide. This is practice — not a real crisis line.
          </p>
        </div>
      </aside>
    </div>
  );
}
