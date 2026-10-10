import { config } from "./config.js";
import { GeminiCaller } from "./ai/geminiCaller.js";
import { GeminiScorer } from "./ai/geminiScorer.js";
import { MockCaller } from "./ai/mockCaller.js";
import { MockScorer } from "./ai/mockScorer.js";
import type { CallerModel, Scorer } from "./ai/types.js";
import { MemoryRepository } from "./db/memoryRepository.js";
import { PgRepository } from "./db/pgRepository.js";
import type { Repository } from "./db/types.js";
import { BackboardMemory } from "./memory/backboardMemory.js";
import { NoopMemory } from "./memory/noopMemory.js";
import type { CallerMemory } from "./memory/types.js";
import { CallService } from "./services/callService.js";
import {
  ElevenLabsSpeechToText,
  ElevenLabsTextToSpeech,
} from "./voice/elevenlabs.js";
import { MockSpeechToText, MockTextToSpeech } from "./voice/mockVoice.js";
import type { SpeechToText, TextToSpeech } from "./voice/types.js";

export interface AppContainer {
  repo: Repository;
  caller: CallerModel;
  scorer: Scorer;
  memory: CallerMemory;
  stt: SpeechToText;
  tts: TextToSpeech;
  calls: CallService;
  providers: {
    ai: string;
    voice: string;
    memory: string;
    repo: string;
  };
}

export function buildContainer(): AppContainer {
  const repo: Repository =
    config.repoProvider === "postgres" ? new PgRepository() : new MemoryRepository();

  const caller: CallerModel =
    config.aiProvider === "gemini" ? new GeminiCaller() : new MockCaller();
  const scorer: Scorer =
    config.aiProvider === "gemini" ? new GeminiScorer() : new MockScorer();

  const memory: CallerMemory =
    config.memoryProvider === "backboard"
      ? new BackboardMemory(repo)
      : new NoopMemory();

  const stt: SpeechToText =
    config.voiceProvider === "elevenlabs"
      ? new ElevenLabsSpeechToText()
      : new MockSpeechToText();
  const tts: TextToSpeech =
    config.voiceProvider === "elevenlabs"
      ? new ElevenLabsTextToSpeech()
      : new MockTextToSpeech();

  const calls = new CallService(repo, caller, scorer, memory, stt, tts);

  return {
    repo,
    caller,
    scorer,
    memory,
    stt,
    tts,
    calls,
    providers: {
      ai: config.aiProvider,
      voice: config.voiceProvider,
      memory: config.memoryProvider,
      repo: config.repoProvider,
    },
  };
}
