import { useEffect, useRef, useState } from "react";
import { cn } from "../ui/cn";

type Phase = "idle" | "recording" | "uploading" | "denied" | "too_short";

const MIN_HOLD_MS = 500;

function preferredMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "audio/webm";
}

/** Stop the recorder and wait until the final dataavailable + onstop fire. */
function stopAndCollect(rec: MediaRecorder): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const chunks: BlobPart[] = [];
    const mime = rec.mimeType || preferredMimeType();

    const onData = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const onError = () => {
      cleanup();
      reject(new Error("Recording failed"));
    };
    const onStop = () => {
      cleanup();
      resolve(new Blob(chunks, { type: mime }));
    };
    const cleanup = () => {
      rec.removeEventListener("dataavailable", onData as EventListener);
      rec.removeEventListener("error", onError);
      rec.removeEventListener("stop", onStop);
    };

    rec.addEventListener("dataavailable", onData as EventListener);
    rec.addEventListener("error", onError);
    rec.addEventListener("stop", onStop);

    try {
      // Flush any buffered audio before stop so the last chunk isn't dropped.
      if (rec.state === "recording") {
        try {
          rec.requestData();
        } catch {
          /* requestData optional on some browsers */
        }
        rec.stop();
      } else {
        cleanup();
        resolve(new Blob(chunks, { type: mime }));
      }
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

export function PushToTalkButton({
  disabled,
  onClip,
  onTooShort,
}: {
  disabled?: boolean;
  onClip: (blob: Blob) => Promise<void>;
  /** Called when the hold was under the minimum duration. */
  onTooShort?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const stoppingRef = useRef(false);
  const mimeRef = useRef(preferredMimeType());

  // Keep the mic stream alive for the whole call; only tear down on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRef.current = null;
    };
  }, []);

  async function ensureStream(): Promise<MediaStream> {
    if (streamRef.current) {
      const live = streamRef.current.getAudioTracks().some((t) => t.readyState === "live");
      if (live) return streamRef.current;
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
    });
    streamRef.current = stream;
    return stream;
  }

  async function start() {
    if (disabled || phase === "recording" || phase === "uploading" || stoppingRef.current) {
      return;
    }
    try {
      const stream = await ensureStream();
      const mime = preferredMimeType();
      mimeRef.current = mime;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRef.current = rec;
      startedAtRef.current = Date.now();
      stoppingRef.current = false;
      // No timeslice — one final blob on stop (avoids dropped/corrupt partials).
      rec.start();
      setPhase("recording");
    } catch {
      setPhase("denied");
    }
  }

  async function stop() {
    const rec = mediaRef.current;
    if (!rec || rec.state !== "recording" || stoppingRef.current) return;
    stoppingRef.current = true;

    const heldMs = Date.now() - startedAtRef.current;
    try {
      const blob = await stopAndCollect(rec);
      mediaRef.current = null;

      if (heldMs < MIN_HOLD_MS || blob.size < 256) {
        setPhase("too_short");
        onTooShort?.();
        window.setTimeout(() => setPhase("idle"), 1200);
        return;
      }

      setPhase("uploading");
      try {
        // Ensure the Blob carries the recorder mimeType for FormData/STT.
        const typed =
          blob.type && blob.type.length > 0
            ? blob
            : new Blob([blob], { type: mimeRef.current });
        await onClip(typed);
      } finally {
        setPhase("idle");
      }
    } catch {
      setPhase("idle");
    } finally {
      stoppingRef.current = false;
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
      onMouseUp={() => void stop()}
      onMouseLeave={() => void stop()}
      onTouchStart={(e) => {
        e.preventDefault();
        void start();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        void stop();
      }}
      className={cn(
        "min-h-12 min-w-[11rem] select-none rounded-md px-5 py-3.5 text-base font-semibold transition disabled:opacity-50",
        phase === "recording"
          ? "animate-soft-pulse bg-risk text-white"
          : phase === "uploading"
            ? "bg-surface-muted text-ink-muted"
            : phase === "too_short"
              ? "bg-amber-100 text-amber-800"
              : "bg-teal-800 text-teal-50 hover:bg-teal-700",
      )}
    >
      {phase === "recording"
        ? "Release to send"
        : phase === "uploading"
          ? "Sending…"
          : phase === "too_short"
            ? "Hold a bit longer"
            : "Hold to talk"}
    </button>
  );
}
