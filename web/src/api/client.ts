import type {
  CallMode,
  CallerRemembersView,
  CallerTurnView,
  DebriefView,
  HealthResponse,
  ScenarioSummary,
  SessionRecord,
  TurnView,
} from "@shared";
import { withStartupRetry } from "./retry";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function requestOnce<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string; code?: string } };
      message = body.error?.message ?? message;
      const err = new Error(message) as Error & { code?: string; status?: number };
      err.code = body.error?.code;
      err.status = res.status;
      throw err;
    } catch (e) {
      if (e instanceof Error && (e as { status?: number }).status) throw e;
      const err = new Error(message) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  // Retry GETs so the SPA survives the API coming up a second later.
  if (method === "GET") {
    return withStartupRetry(() => requestOnce<T>(path, init));
  }
  return requestOnce<T>(path, init);
}

export const api = {
  health: () => request<HealthResponse>("/api/health"),
  trainees: () =>
    request<{ trainees: { id: string; displayName: string }[] }>("/api/trainees"),
  scenarios: () => request<{ scenarios: ScenarioSummary[] }>("/api/scenarios"),
  startSession: (body: {
    traineeId: string;
    scenarioId: string;
    mode: CallMode;
  }) =>
    request<{
      session: SessionRecord;
      openingTurn: CallerTurnView;
      callerRemembers?: CallerRemembersView;
    }>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getSession: (id: string) =>
    request<{
      session: SessionRecord;
      turns: TurnView[];
      debrief: DebriefView | null;
      callerRemembers?: CallerRemembersView;
    }>(`/api/sessions/${id}`),
  postTextTurn: (id: string, text: string) =>
    request<{
      traineeTurn: TurnView;
      callerTurn: CallerTurnView;
      callEnded: boolean;
    }>(`/api/sessions/${id}/turns`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  postAudioTurn: async (id: string, blob: Blob) => {
    const form = new FormData();
    const mime = blob.type || "audio/webm";
    const ext = mime.includes("mp4")
      ? "m4a"
      : mime.includes("ogg")
        ? "ogg"
        : mime.includes("wav")
          ? "wav"
          : mime.includes("mpeg") || mime.includes("mp3")
            ? "mp3"
            : "webm";
    // Filename + blob type must match so multer/ElevenLabs see playable audio.
    form.append("audio", blob, `turn.${ext}`);
    return request<{
      traineeTurn: TurnView;
      callerTurn: CallerTurnView;
      callEnded: boolean;
    }>(`/api/sessions/${id}/turns`, { method: "POST", body: form });
  },
  endSession: (id: string) =>
    request<{ debrief: DebriefView }>(`/api/sessions/${id}/end`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  audioUrl: (sessionId: string, seq: number) =>
    `${BASE}/api/sessions/${sessionId}/turns/${seq}/audio`,
};
