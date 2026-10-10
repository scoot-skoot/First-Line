import type {
  CallerRemembersView,
  CallerTurnView,
  DebriefView,
  Emotion,
  SessionRecord,
  TurnView,
} from "@shared";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
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

export interface DuplexStatus {
  callMode: "ptt" | "duplex";
  duplexEnabled: boolean;
  llmMode: "overrides" | "custom";
  connectionType: "webrtc" | "websocket";
  agentConfigured: boolean;
  agentIdPresent: boolean;
  customLlmPath: string;
}

export interface DuplexOverrides {
  agent: {
    prompt: { prompt: string };
    firstMessage: string;
    language: "en";
  };
  tts: { voiceId: string };
}

export interface DuplexStartResponse {
  session: SessionRecord;
  openingTurn: CallerTurnView | null;
  callerRemembers: CallerRemembersView;
  agentId: string;
  connectionType: "webrtc" | "websocket";
  llmMode: "overrides" | "custom";
  signedUrl?: string;
  conversationToken?: string;
  conversationId?: string;
  overrides: DuplexOverrides;
  customLlmExtraBody: { sessionId: string };
  clientTools: string[];
}

export const duplexApi = {
  status: () => request<DuplexStatus>("/api/duplex/status"),
  startSession: (body: { traineeId: string; scenarioId: string }) =>
    request<DuplexStartResponse>("/api/duplex/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  appendTurn: (
    sessionId: string,
    body: { speaker: "trainee" | "caller"; text: string; source?: string },
  ) =>
    request<{ turn: TurnView }>(`/api/duplex/sessions/${sessionId}/turns`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  reportState: (
    sessionId: string,
    body: {
      distress: number;
      trust: number;
      emotion: Emotion;
      revealed_warning_signs?: string[];
      should_end_call?: boolean;
      caller_line?: string;
    },
  ) =>
    request<{
      turn: CallerTurnView | null;
      distress: number;
      trust: number;
      callEnded: boolean;
    }>(`/api/duplex/sessions/${sessionId}/state`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  endSession: (sessionId: string) =>
    request<{ debrief: DebriefView }>(`/api/duplex/sessions/${sessionId}/end`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  refreshCredentials: (sessionId: string) =>
    request<{
      connectionType: "webrtc" | "websocket";
      signedUrl?: string;
      conversationToken?: string;
      conversationId?: string;
      agentId: string;
    }>(`/api/duplex/sessions/${sessionId}/credentials`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
};
