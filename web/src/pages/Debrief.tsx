import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { DebriefView } from "@shared";
import { api } from "../api/client";
import { DebriefCard } from "../components/DebriefCard";

export function Debrief() {
  const { id = "" } = useParams();
  const [debrief, setDebrief] = useState<DebriefView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.getSession(id);
        if (data.debrief) {
          setDebrief(data.debrief);
        } else {
          const ended = await api.endSession(id);
          setDebrief(ended.debrief);
        }
      } catch (e) {
        setError((e as Error).message || "Debrief unavailable, try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">
          Debrief · Training simulator only
        </p>
        <Link to="/" className="text-sm text-ink-muted hover:text-signal">
          ← Back to queue
        </Link>
      </div>
      {loading && (
        <p className="animate-fade-up text-ink-muted">Preparing your debrief…</p>
      )}
      {error && (
        <div className="border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-alert">
          {error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}
      {debrief && <DebriefCard debrief={debrief} />}
    </div>
  );
}
