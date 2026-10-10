import { useEffect, useRef, useState } from "react";
import { cn } from "../ui/cn";

type Phase = "idle" | "recording" | "uploading" | "denied";

export function PushToTalkButton({
  disabled,
  onClip,
  /** Soft max hold (ms); when hit, stop and call onMaxHold instead of onClip. */
  maxHoldMs,
  onMaxHold,
  onRecordingStart,
  onRecordingEnd,
}: {
  disabled?: boolean;
  onClip: (blob: Blob) => Promise<void>;
  maxHoldMs?: number | null;
  onMaxHold?: (blob: Blob) => Promise<void>;
  onRecordingStart?: () => void;
  onRecordingEnd?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxHoldFired = useRef(false);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  async function start() {
    if (disabled || phase === "recording" || phase === "uploading") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      maxHoldFired.current = false;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: mime });
        stream.getTracks().forEach((t) => t.stop());
        onRecordingEnd?.();
        setPhase("uploading");
        try {
          if (maxHoldFired.current && onMaxHold) {
            await onMaxHold(blob);
          } else {
            await onClip(blob);
          }
        } finally {
          setPhase("idle");
        }
      };
      mediaRef.current = rec;
      rec.start();
      setPhase("recording");
      onRecordingStart?.();

      if (maxHoldMs && maxHoldMs > 0 && onMaxHold) {
        holdTimerRef.current = setTimeout(() => {
          maxHoldFired.current = true;
          if (mediaRef.current && mediaRef.current.state === "recording") {
            mediaRef.current.stop();
          }
        }, maxHoldMs);
      }
    } catch {
      setPhase("denied");
    }
  }

  function stop() {
    if (mediaRef.current && mediaRef.current.state === "recording") {
      mediaRef.current.stop();
    }
  }

  if (phase === "denied") {
    return (
      <p className="text-sm text-amber-700">
        Microphone permission denied — use the text box instead.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || phase === "uploading"}
      onMouseDown={() => void start()}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={(e) => {
        e.preventDefault();
        void start();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stop();
      }}
      className={cn(
        "min-h-12 min-w-[11rem] select-none rounded-md px-5 py-3.5 text-base font-semibold transition disabled:opacity-50",
        phase === "recording"
          ? "animate-soft-pulse bg-risk text-white"
          : phase === "uploading"
            ? "bg-surface-muted text-ink-muted"
            : "bg-teal-800 text-teal-50 hover:bg-teal-700",
      )}
    >
      {phase === "recording"
        ? "Release to send"
        : phase === "uploading"
          ? "Sending…"
          : "Hold to talk"}
    </button>
  );
}
