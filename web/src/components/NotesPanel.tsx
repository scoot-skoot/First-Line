import { useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "firstline-notes-";

export function NotesPanel({ sessionId }: { sessionId: string }) {
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + sessionId);
      if (raw) setNotes(raw);
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  function onChange(value: string) {
    setNotes(value);
    setSaved(false);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_PREFIX + sessionId, value);
        setSaved(true);
      } catch {
        /* ignore */
      }
    }, 400);
  }

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">Call notes</h3>
        <span
          className={`text-xs ${saved ? "text-success" : "text-ink-faint"}`}
          aria-live="polite"
        >
          {saved ? "Notes saved" : "Autosave"}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder="Jot what you hear — feelings, supports, safety cues…"
        className="w-full resize-y rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-teal-600"
      />
    </div>
  );
}
