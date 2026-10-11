import type { BuildCallerResponse, ReadinessReport } from "@shared";
import { withStartupRetry } from "../api/retry";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function requestOnce<T>(path: string, init?: RequestInit): Promise<T> {
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
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method === "GET") {
    return withStartupRetry(() => requestOnce<T>(path, init));
  }
  return requestOnce<T>(path, init);
}

/** Feature-owned API helpers (Build-a-Caller + Readiness). */
export const featuresApi = {
  buildCaller: (description: string) =>
    request<BuildCallerResponse>("/api/scenarios/build", {
      method: "POST",
      body: JSON.stringify({ description }),
    }),
  readiness: (traineeId: string) =>
    request<{ report: ReadinessReport }>(
      `/api/trainees/${traineeId}/readiness`,
    ),
  trainees: () =>
    request<{ trainees: { id: string; displayName: string }[] }>(
      "/api/trainees",
    ),
};
