import type { TurnView } from "@shared";
import { CallerAvatar } from "../ui";

export function Transcript({
  turns,
  bottomRef,
  callerName = "Caller",
}: {
  turns: TurnView[];
  bottomRef?: React.RefObject<HTMLDivElement | null>;
  callerName?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
      {turns.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-muted">
          Waiting for the caller…
        </p>
      )}
      {turns.map((t) => {
        const isCaller = t.speaker === "caller";
        return (
          <div
            key={`${t.seq}-${t.speaker}`}
            className={`animate-fade-up flex max-w-[92%] gap-2.5 ${
              isCaller ? "self-start" : "self-end flex-row-reverse"
            }`}
          >
            {isCaller ? (
              <CallerAvatar name={callerName} size="sm" />
            ) : (
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-800 text-xs font-semibold text-teal-50"
                aria-hidden
              >
                You
              </span>
            )}
            <div
              className={`rounded-lg border px-3 py-2.5 ${
                isCaller
                  ? "border-line bg-surface"
                  : "border-teal-100 bg-teal-50"
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                <span>{isCaller ? callerName : "You"}</span>
                <span aria-hidden>·</span>
                <span>#{t.seq}</span>
                {isCaller && t.emotion ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{t.emotion}</span>
                  </>
                ) : null}
                {t.safetyFallback ? (
                  <span className="text-amber-700">· fallback</span>
                ) : null}
              </div>
              <p className="text-[15px] leading-relaxed text-ink">{t.text}</p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
