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

export const config = {
  port: Number(process.env.PORT ?? 3001),
  aiProvider: provider("AI_PROVIDER", "mock", ["mock", "gemini"] as const),
  voiceProvider: provider("VOICE_PROVIDER", "mock", ["mock", "elevenlabs"] as const),
  memoryProvider: provider("MEMORY_PROVIDER", "none", ["none", "backboard"] as const),
  repoProvider: provider("REPO_PROVIDER", "memory", ["memory", "postgres"] as const),
  geminiApiKey: optional("GEMINI_API_KEY"),
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
  geminiScorerModel: process.env.GEMINI_SCORER_MODEL ?? "gemini-3.8-flash",
  elevenLabsApiKey: optional("ELEVENLABS_API_KEY"),
  elevenLabsDefaultVoiceId:
    process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL",
  elevenLabsTtsModel: process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2_5",
  elevenLabsSttModel: process.env.ELEVENLABS_STT_MODEL ?? "scribe_v2",
  backboardApiKey: optional("BACKBOARD_API_KEY"),
  databaseUrl: optional("DATABASE_URL"),
  /** Caller interruptions: PTT hold / silence thresholds (ms). Higher distress → shorter. */
  interruptPttHoldMsBase: Number(process.env.INTERRUPT_PTT_HOLD_MS ?? 14000),
  interruptPttHoldMsMin: Number(process.env.INTERRUPT_PTT_HOLD_MS_MIN ?? 8000),
  interruptPttHoldMsMax: Number(process.env.INTERRUPT_PTT_HOLD_MS_MAX ?? 15000),
  interruptSilenceMsBase: Number(process.env.INTERRUPT_SILENCE_MS ?? 9000),
  interruptSilenceMsMin: Number(process.env.INTERRUPT_SILENCE_MS_MIN ?? 5000),
  interruptSilenceMsMax: Number(process.env.INTERRUPT_SILENCE_MS_MAX ?? 10000),
};

export function interruptionThresholdsFromConfig() {
  return {
    pttHoldMsBase: config.interruptPttHoldMsBase,
    pttHoldMsMin: config.interruptPttHoldMsMin,
    pttHoldMsMax: config.interruptPttHoldMsMax,
    silenceMsBase: config.interruptSilenceMsBase,
    silenceMsMin: config.interruptSilenceMsMin,
    silenceMsMax: config.interruptSilenceMsMax,
  };
}

/** Scale hold/silence windows: high distress/agitation → shorter wait. */
export function scaledInterruptMs(
  distress: number,
  min: number,
  max: number,
): number {
  const d = Math.max(0, Math.min(100, distress)) / 100;
  return Math.round(max - d * (max - min));
}

/** Require an env var; throw a named missing-env error (never log the value). */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}
