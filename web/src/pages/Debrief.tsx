import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { DebriefView } from "@shared";
import { api } from "../api/client";
import { DebriefCard } from "../components/DebriefCard";
import { Skeleton } from "../ui";

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Take a moment with this feedback — then try another call.
        </p>
        <Link
          to="/"
          className="text-sm font-semibold text-teal-800 hover:underline"
        >
          ← Practice
        </Link>
      </div>
      {loading && (
        <div className="space-y-4" aria-busy="true" aria-label="Preparing debrief">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <p className="animate-soft-pulse text-sm text-ink-muted">
            Preparing your debrief…
          </p>
        </div>
      )}
      {error && (
        <div
          className="rounded-md border border-risk/30 bg-risk-soft px-4 py-3 text-sm text-risk"
          role="alert"
        >
          {error}
          <button
            type="button"
            className="ml-3 font-semibold underline"
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
