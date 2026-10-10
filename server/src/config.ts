import "dotenv/config";

function optional(name: string): string | undefined {
  const v = process.env[name];
  if (!v) console.warn(`[config] ${name} is not set`);
  return v;
}

function provider<T extends string>(name: string, fallback: T, allowed: readonly T[]): T {
  const raw = (process.env[name] ?? fallback).toLowerCase() as T;
  if (!allowed.includes(raw)) {
    console.warn(`[config] ${name}=${raw} invalid; using ${fallback}`);
    return fallback;
  }
  return raw;
}

export type AiProvider = "mock" | "gemini";
export type VoiceProvider = "mock" | "elevenlabs";
export type MemoryProvider = "none" | "backboard";
export type RepoProvider = "memory" | "postgres";
/** ptt = existing push-to-talk loop (default). duplex = ElevenLabs Agents full-duplex. */
export type CallModeSetting = "ptt" | "duplex";
/** overrides = built-in LLM + prompt overrides (demo-safe). custom = our Gemini OpenAI-compat endpoint. */
export type DuplexLlmMode = "overrides" | "custom";
export type DuplexConnection = "webrtc" | "websocket";

export const config = {
  port: Number(process.env.PORT ?? 3001),
  aiProvider: provider("AI_PROVIDER", "mock", ["mock", "gemini"] as const),
  voiceProvider: provider("VOICE_PROVIDER", "mock", ["mock", "elevenlabs"] as const),
  memoryProvider: provider("MEMORY_PROVIDER", "none", ["none", "backboard"] as const),
  repoProvider: provider("REPO_PROVIDER", "memory", ["memory", "postgres"] as const),
  callMode: provider("CALL_MODE", "ptt", ["ptt", "duplex"] as const),
  duplexLlmMode: provider("DUPLEX_LLM_MODE", "overrides", [
    "overrides",
    "custom",
  ] as const),
  duplexConnection: provider("DUPLEX_CONNECTION", "webrtc", [
    "webrtc",
    "websocket",
  ] as const),
  geminiApiKey: optional("GEMINI_API_KEY"),
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
  geminiScorerModel: process.env.GEMINI_SCORER_MODEL ?? "gemini-3.8-flash",
  elevenLabsApiKey: optional("ELEVENLABS_API_KEY"),
  elevenLabsDefaultVoiceId:
    process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL",
  elevenLabsTtsModel: process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2_5",
  elevenLabsSttModel: process.env.ELEVENLABS_STT_MODEL ?? "scribe_v2",
  /** Private ElevenLabs Agents agent id (agent_…). Required when CALL_MODE=duplex. */
  elevenLabsAgentId: optional("ELEVENLABS_AGENT_ID"),
  backboardApiKey: optional("BACKBOARD_API_KEY"),
  databaseUrl: optional("DATABASE_URL"),
};

/** Require an env var; throw a named missing-env error (never log the value). */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}
