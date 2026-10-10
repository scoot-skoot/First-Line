import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Readable } from "node:stream";
import { config } from "../config.js";
import type { SpeechToText, TextToSpeech, TtsOptions } from "./types.js";

/**
 * ElevenLabs adapters.
 * TTS stream: https://github.com/elevenlabs/elevenlabs-js (textToSpeech.stream)
 * STT: https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-to-text
 * (speechToText.convert)
 */

function client(): ElevenLabsClient {
  if (!config.elevenLabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY required");
  }
  return new ElevenLabsClient({ apiKey: config.elevenLabsApiKey });
}

/** E2: map distress/emotion → voiceSettings. */
export function voiceSettingsForDistress(
  distress?: number,
  _emotion?: string,
): { stability: number; similarityBoost: number; style: number; speed: number } {
  const d = Math.max(0, Math.min(1, (distress ?? 50) / 100));
  return {
    stability: 0.75 - 0.5 * d,
    similarityBoost: 0.75,
    style: 0.1 + 0.4 * d,
    speed: 1.0 - 0.1 * d,
  };
}

export class ElevenLabsSpeechToText implements SpeechToText {
  async transcribe(audio: Buffer, mimeType: string): Promise<string> {
    const el = client();
    // VERIFY IN DOCS: Scribe accepting audio/webm (opus) uploads directly
    // https://elevenlabs.io/docs/eleven-api/guides/cookbooks/speech-to-text
    // Copy into a plain ArrayBuffer so BlobPart typing accepts it (Node Buffer vs DOM).
    const bytes = Uint8Array.from(audio);
    const result = await el.speechToText.convert({
      file: new Blob([bytes], { type: mimeType || "audio/webm" }),
      modelId: config.elevenLabsSttModel,
    });
    // VERIFY IN DOCS: response type union (multichannel) — prefer .text when present
    const text = (result as { text?: string }).text;
    if (typeof text === "string" && text.trim()) return text.trim();
    throw new Error("ElevenLabs STT returned no text");
  }
}

export class ElevenLabsTextToSpeech implements TextToSpeech {
  async stream(text: string, opts: TtsOptions): Promise<NodeJS.ReadableStream> {
    const el = client();
    const voiceId = opts.voiceId || config.elevenLabsDefaultVoiceId;
    const settings = voiceSettingsForDistress(opts.distress, opts.emotion);

    // VERIFY IN DOCS: outputFormat option name/location in the SDK
    // https://github.com/elevenlabs/elevenlabs-js — request body uses camelCase modelId;
    // outputFormat is accepted on the stream request (query/body per SDK serializers).
    const audio = await el.textToSpeech.stream(voiceId, {
      text,
      modelId: config.elevenLabsTtsModel,
      outputFormat: "mp3_44100_128",
      voiceSettings: {
        stability: settings.stability,
        similarityBoost: settings.similarityBoost,
        style: settings.style,
        speed: settings.speed,
      },
    });

    return Readable.fromWeb(audio as import("node:stream/web").ReadableStream);
  }
}
