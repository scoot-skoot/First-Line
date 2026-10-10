import type { TurnView } from "@shared";

export function Transcript({
  turns,
  bottomRef,
}: {
  turns: TurnView[];
  bottomRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
      {turns.map((t) => {
        const isCaller = t.speaker === "caller";
        return (
          <div
            key={`${t.seq}-${t.speaker}`}
            className={`animate-fade-up max-w-[92%] rounded-sm border px-3 py-2.5 ${
              isCaller
                ? "self-start border-line bg-console-800/70"
                : "self-end border-signal/30 bg-signal/10"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              <span>{isCaller ? "Caller" : "You"}</span>
              <span>·</span>
              <span>#{t.seq}</span>
              {isCaller && t.emotion ? <span>· {t.emotion}</span> : null}
              {t.safetyFallback ? (
                <span className="text-amber">· fallback</span>
              ) : null}
            </div>
            <p className="text-[15px] leading-relaxed text-ink">{t.text}</p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
