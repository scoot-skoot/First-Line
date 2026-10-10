import type {
  InterruptionKind,
  InterruptionResponse,
  InterruptionThresholds,
} from "@shared";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const interruptionsApi = {
  thresholds: () =>
    request<{ thresholds: InterruptionThresholds }>("/api/interruptions/thresholds"),

  interrupt: (
    sessionId: string,
    body: {
      kind: InterruptionKind;
      partialText?: string;
      bargeInFromSeq?: number;
      audio?: Blob;
    },
  ) => {
    if (body.audio) {
      const form = new FormData();
      form.append("kind", body.kind);
      if (body.partialText) form.append("partialText", body.partialText);
      if (body.bargeInFromSeq != null) {
        form.append("bargeInFromSeq", String(body.bargeInFromSeq));
      }
      form.append("audio", body.audio, "partial.webm");
      return request<InterruptionResponse>(
        `/api/sessions/${sessionId}/interruptions`,
        { method: "POST", body: form },
      );
    }
    return request<InterruptionResponse>(
      `/api/sessions/${sessionId}/interruptions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: body.kind,
          partialText: body.partialText,
          bargeInFromSeq: body.bargeInFromSeq,
        }),
      },
    );
  },
};
