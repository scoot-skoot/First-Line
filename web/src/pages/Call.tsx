import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { SessionRecord, TurnView } from "@shared";
import { api } from "../api/client";
import { NotesPanel } from "../components/NotesPanel";
import { PushToTalkButton } from "../components/PushToTalkButton";
import { ResourcesSidebar } from "../components/ResourcesSidebar";
import { RiskChecklist } from "../components/RiskChecklist";
import { TrainingOverlay } from "../components/TrainingOverlay";
import { Transcript } from "../components/Transcript";
import {
  Button,
  CallerAvatar,
  Chip,
  Collapse,
  Panel,
} from "../ui";

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
  const [escalated, setEscalated] = useState(false);
  const [callerName, setCallerName] = useState("Caller");
  /** Placeholder for features-agent remembered facts (Backboard). */
  const [rememberedFacts] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pausedRef = useRef(false);

  const callerTurns = useMemo(
    () => turns.filter((t) => t.speaker === "caller"),
    [turns],
  );
  const latestCaller = callerTurns.at(-1);
  const prevDistress =
    callerTurns.length >= 2
      ? (callerTurns.at(-2)?.distress ?? null)
      : null;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    function playOpening(seq: number) {
      if (pausedRef.current) return;
      const url = api.audioUrl(id, seq);
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      void audio.play().catch(() => {
        // Autoplay often blocked until a user gesture; transcript remains primary.
      });
    }

    void (async () => {
      const data = await api.getSession(id);
      setSession(data.session);
      setTurns(data.turns);
      setMode(data.session.mode);
      if (data.session.status !== "in_progress") setCallEnded(true);
      try {
        const sc = await api.scenarios();
        const match = sc.scenarios.find((s) => s.id === data.session.scenarioId);
        if (match) setCallerName(match.personaName);
      } catch {
        /* optional enrichment */
      }
      const opening = data.turns.find((t) => t.speaker === "caller");
      if (opening?.audioUrl) playOpening(opening.seq);
    })().catch((e) => setToast((e as Error).message));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  function playAudio(seq: number) {
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
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-6xl flex-col gap-4 px-4 py-5 lg:flex-row">
      {/* Left: caller + transcript + input */}
      <section className="flex min-h-[55vh] flex-1 flex-col rounded-lg border border-line bg-surface-raised p-4 shadow-sm shadow-teal-950/5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CallerAvatar name={callerName} size="md" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                Live practice call
              </p>
              <h1 className="font-display text-xl font-semibold text-ink">
                {callerName}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={togglePause}>
              {paused ? "Resume" : "Pause / I need a break"}
            </Button>
            <Link
              to="/"
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              Leave call
            </Link>
          </div>
        </div>

        {/* Slot for features-agent remembered facts */}
        <div className="mb-3 flex min-h-[1.75rem] flex-wrap gap-2" data-slot="caller-remembers">
          {rememberedFacts.length > 0 ? (
            rememberedFacts.map((fact) => (
              <Chip key={fact} tone="memory">
                Caller remembers: {fact}
              </Chip>
            ))
          ) : (
            <Chip tone="muted" className="opacity-70">
              Caller remembers: — (will appear on callbacks)
            </Chip>
          )}
        </div>

        {paused && (
          <div className="mb-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-ink">
            Simulation paused. Take a breath. If you need support yourself, call
            or text <strong>988</strong>.
          </div>
        )}

        <Transcript turns={turns} bottomRef={bottomRef} callerName={callerName} />

        {busy && (
          <p className="mt-2 animate-soft-pulse text-sm text-ink-muted">
            {callerName} is responding…
          </p>
        )}

        {callEnded && (
          <p className="mt-3 text-sm text-amber-700">
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
            <div
              className="flex rounded-md border border-line text-sm"
              role="group"
              aria-label="Input mode"
            >
              <button
                type="button"
                className={`rounded-l-md px-3 py-2 font-medium ${
                  mode === "text"
                    ? "bg-teal-800 text-teal-50"
                    : "text-ink-muted hover:bg-surface-muted"
                }`}
                onClick={() => setMode("text")}
              >
                Text
              </button>
              <button
                type="button"
                className={`rounded-r-md px-3 py-2 font-medium ${
                  mode === "voice"
                    ? "bg-teal-800 text-teal-50"
                    : "text-ink-muted hover:bg-surface-muted"
                }`}
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
            <Button
              variant="accent"
              size="lg"
              className="ml-auto"
              disabled={ending || busy}
              onClick={() => void endAndDebrief()}
            >
              {ending ? "Preparing debrief…" : "End call"}
            </Button>
          </div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy || paused || callEnded}
              placeholder="Type a response (always available)…"
              className="min-h-11 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-ink outline-none placeholder:text-ink-faint focus:border-teal-600 disabled:opacity-50"
            />
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              disabled={busy || paused || callEnded || !text.trim()}
            >
              Send
            </Button>
          </div>
          {toast && (
            <p className="text-sm text-amber-700" role="status">
              {toast}
            </p>
          )}
        </form>
      </section>

      {/* Right: context panel */}
      <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[22rem]">
        <TrainingOverlay
          distress={latestCaller?.distress ?? 0}
          trust={latestCaller?.trust}
          previous={prevDistress}
          history={callerTurns}
        />

        <Panel className="space-y-4">
          <NotesPanel sessionId={id} />
          <div className="border-t border-line pt-4">
            <RiskChecklist sessionId={id} />
          </div>
        </Panel>

        <Panel padded={false} className="px-4">
          <Collapse title="Local resources" defaultOpen={false}>
            <ResourcesSidebar />
          </Collapse>
        </Panel>

        <Button
          variant="danger"
          size="lg"
          className="w-full"
          onClick={() => setEscalated(true)}
        >
          Escalate to supervisor
        </Button>
        {escalated && (
          <p className="animate-fade-up rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-900">
            In a real center, this would page your supervisor. For this
            simulation, keep practicing — or pause if you need a break.
          </p>
        )}

        {session && (
          <p className="text-center text-xs text-ink-faint">
            Session {session.id.slice(0, 8)} · {session.mode} mode
          </p>
        )}
      </aside>
    </div>
  );
}
