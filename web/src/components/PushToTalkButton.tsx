import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "recording" | "uploading" | "denied";

export function PushToTalkButton({
  disabled,
  onClip,
}: {
  disabled?: boolean;
  onClip: (blob: Blob) => Promise<void>;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
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
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        stream.getTracks().forEach((t) => t.stop());
        setPhase("uploading");
        try {
          await onClip(blob);
        } finally {
          setPhase("idle");
        }
      };
      mediaRef.current = rec;
      rec.start();
      setPhase("recording");
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
      <p className="text-sm text-amber">
        Microphone permission denied — use the text box instead.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || phase === "uploading"}
      onMouseDown={start}
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
      className={`min-w-[10rem] select-none px-5 py-3 font-semibold transition disabled:opacity-50 ${
        phase === "recording"
          ? "animate-pulse-ring bg-alert text-white"
          : "bg-console-700 text-ink hover:bg-console-600"
      }`}
    >
      {phase === "recording"
        ? "Release to send"
        : phase === "uploading"
          ? "Sending…"
          : "Hold to talk"}
    </button>
  );
}
