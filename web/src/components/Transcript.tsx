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
            className={`animate-fade-up max-w-[92%] rounded-2xl px-3.5 py-2.5 ${
              isCaller
                ? "self-start border border-line bg-white"
                : "self-end bg-teal-50 text-ink-900"
            }`}
          >
            <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-ink-400">
              <span>{isCaller ? "Caller" : "You"}</span>
              <span>·</span>
              <span>#{t.seq}</span>
              {isCaller && t.emotion ? <span>· {t.emotion}</span> : null}
            </div>
            <p className="text-[15px] leading-relaxed text-ink-900">{t.text}</p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
