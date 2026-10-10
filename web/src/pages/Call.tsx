import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { SessionRecord, TurnView } from "@shared";
import { api } from "../api/client";
import { DistressMeter } from "../components/DistressMeter";
import { LocalResources } from "../components/LocalResources";
import { PushToTalkButton } from "../components/PushToTalkButton";
import { RiskChecklist } from "../components/RiskChecklist";
import { Transcript } from "../components/Transcript";

export function Call() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [turns, setTurns] = useState<TurnView[]>([]);
  const [memories, setMemories] = useState<string[]>([]);
  const [callerName, setCallerName] = useState("Caller");
  const [notes, setNotes] = useState("");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const callerTurns = useMemo(
    () => turns.filter((t) => t.speaker === "caller"),
    [turns],
  );
  const latestCaller = callerTurns.at(-1);
  const prevDistress =
    callerTurns.length >= 2 ? (callerTurns.at(-2)?.distress ?? null) : null;

  useEffect(() => {
    void (async () => {
      const data = await api.getSession(id);
      setSession(data.session);
      setTurns(data.turns);
      setMode(data.session.mode);
      setMemories(data.memories ?? []);
      setCallerName(data.personaName ?? "Caller");
      if (data.session.status !== "in_progress") setCallEnded(true);
      const opening = data.turns.find((t) => t.speaker === "caller");
      if (opening?.audioUrl) playAudio(opening.seq);
    })().catch((e) => setToast((e as Error).message));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  function playAudio(seq: number) {
    if (paused) return;
    const url = api.audioUrl(id, seq);
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    void audio.play().catch(() => {});
  }

  async function sendText(value: string) {
    if (!value.trim() || busy || paused || callEnded) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await api.postTextTurn(id, value.trim());
      setTurns((t) => [...t, res.traineeTurn, res.callerTurn]);
      setText("");
      if (res.callerTurn.audioUrl) playAudio(res.callerTurn.seq);
      if (res.callEnded) setCallEnded(true);
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
    try {
      const res = await api.postAudioTurn(id, blob);
      setTurns((t) => [...t, res.traineeTurn, res.callerTurn]);
      if (res.callerTurn.audioUrl) playAudio(res.callerTurn.seq);
      if (res.callEnded) setCallEnded(true);
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
    <div className="mx-auto grid min-h-[calc(100vh-3.25rem)] max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
      {/* Left: caller + transcript */}
      <section className="flex min-h-[52vh] flex-col rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              Live practice call · Training only
            </p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-ink-900">
              {callerName}
            </h1>
            <p className="text-sm text-ink-500">
              Session {session ? session.id.slice(0, 8) : "…"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={togglePause}
              className="rounded-xl border border-line px-3 py-1.5 text-sm text-ink-700 hover:border-warn-500/50"
            >
              {paused ? "Resume" : "Pause / I need a break"}
            </button>
            <Link
              to="/"
              className="rounded-xl border border-line px-3 py-1.5 text-sm text-ink-500 hover:text-ink-900"
            >
              Queue
            </Link>
          </div>
        </div>

        {memories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {memories.slice(0, 4).map((m) => (
              <span
                key={m}
                className="max-w-full rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs text-teal-700"
                title={m}
              >
                Caller remembers: {m.length > 90 ? `${m.slice(0, 90)}…` : m}
              </span>
            ))}
          </div>
        )}

        {paused && (
          <div className="mb-3 rounded-xl border border-warn-100 bg-warn-100/70 px-3 py-3 text-sm text-ink-700">
            Simulation paused. Take a breath. If you need support yourself, call
            or text <strong>988</strong>.
          </div>
        )}

        <div className="mb-3 lg:hidden">
          <DistressMeter
            distress={latestCaller?.distress ?? 0}
            trust={latestCaller?.trust}
            previous={prevDistress}
            history={callerTurns}
          />
        </div>

        <Transcript turns={turns} bottomRef={bottomRef} />

        {callEnded && (
          <p className="mt-3 text-sm text-warn-600">
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
            <div className="flex overflow-hidden rounded-xl border border-line text-sm">
              <button
                type="button"
                className={`px-3 py-1.5 ${mode === "text" ? "bg-surface-100 font-medium text-ink-900" : "text-ink-500"}`}
                onClick={() => setMode("text")}
              >
                Text
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 ${mode === "voice" ? "bg-surface-100 font-medium text-ink-900" : "text-ink-500"}`}
                onClick={() => setMode("voice")}
              >
                Voice
              </button>
            </div>
            {mode === "voice" && (
              <PushToTalkButton
                disabled={busy || paused || callEnded}
                onClip={sendAudio}
              />
            )}
            <button
              type="button"
              disabled={ending || busy}
              onClick={() => void endAndDebrief()}
              className="ml-auto rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
              className="flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-ink-900 outline-none placeholder:text-ink-400 focus:border-teal-500/50"
            />
            <button
              type="submit"
              disabled={busy || paused || callEnded || !text.trim()}
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink-700 hover:border-teal-500/40 disabled:opacity-40"
            >
              Send
            </button>
          </div>
          {toast && <p className="text-sm text-warn-600">{toast}</p>}
        </form>
      </section>

      {/* Right: training overlay + notes + checklist + resources */}
      <aside className="flex flex-col gap-3">
        <div className="hidden lg:block">
          <DistressMeter
            distress={latestCaller?.distress ?? 0}
            trust={latestCaller?.trust}
            previous={prevDistress}
            history={callerTurns}
          />
        </div>

        <section className="rounded-2xl border border-line bg-white/90 p-4">
          <h3 className="text-sm font-semibold text-ink-900">Call notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Jot observations, possible warning signs, follow-ups…"
            className="mt-2 w-full resize-y rounded-xl border border-line bg-surface-50 px-3 py-2 text-sm text-ink-900 outline-none focus:border-teal-500/40"
          />
        </section>

        <RiskChecklist />
        <LocalResources />

        <button
          type="button"
          onClick={() => setEscalated(true)}
          className="rounded-xl border border-rose-100 bg-rose-100/50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
        >
          Escalate to supervisor
        </button>
        {escalated && (
          <p className="rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink-500">
            In a real center this would page a supervisor. Here it logs a
            practice escalation — keep supporting the caller and end when ready.
          </p>
        )}
      </aside>
    </div>
  );
}
