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
import { CompositeMemory } from "./memory/compositeMemory.js";
import { LocalMemory } from "./memory/localMemory.js";
import type { CallerMemory } from "./memory/types.js";
import { CallService } from "./services/callService.js";
import { DuplexService } from "./duplex/duplexService.js";
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
  compositeMemory: CompositeMemory;
  stt: SpeechToText;
  tts: TextToSpeech;
  calls: CallService;
  duplex: DuplexService;
  providers: {
    ai: string;
    voice: string;
    memory: string;
    repo: string;
    callMode: string;
    duplexLlmMode: string;
  };
}

export function buildContainer(): AppContainer {
  const repo: Repository =
    config.repoProvider === "postgres" ? new PgRepository() : new MemoryRepository();

  const caller: CallerModel =
    config.aiProvider === "gemini" ? new GeminiCaller() : new MockCaller();
  const scorer: Scorer =
    config.aiProvider === "gemini" ? new GeminiScorer() : new MockScorer();

  const localMemory = new LocalMemory(repo);
  const primary =
    config.memoryProvider === "backboard" ? new BackboardMemory(repo) : null;
  const compositeMemory = new CompositeMemory(primary, localMemory);
  const memory: CallerMemory = compositeMemory;

  const stt: SpeechToText =
    config.voiceProvider === "elevenlabs"
      ? new ElevenLabsSpeechToText()
      : new MockSpeechToText();
  const tts: TextToSpeech =
    config.voiceProvider === "elevenlabs"
      ? new ElevenLabsTextToSpeech()
      : new MockTextToSpeech();

  const calls = new CallService(repo, caller, scorer, memory, stt, tts);
  const duplex = new DuplexService(repo, caller, memory, calls);

  return {
    repo,
    caller,
    scorer,
    memory,
    compositeMemory,
    stt,
    tts,
    calls,
    duplex,
    providers: {
      ai: config.aiProvider,
      voice: config.voiceProvider,
      memory: config.memoryProvider,
      repo: config.repoProvider,
      callMode: config.callMode,
      duplexLlmMode: config.duplexLlmMode,
    },
  };
}
