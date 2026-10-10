import { createReadStream, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import type { SpeechToText, TextToSpeech, TtsOptions } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_MP3 = join(__dirname, "../../assets/mock.mp3");

export class MockSpeechToText implements SpeechToText {
  async transcribe(_audio: Buffer, _mimeType: string): Promise<string> {
    return "this is a mock transcript";
  }
}

export class MockTextToSpeech implements TextToSpeech {
  async stream(_text: string, _opts: TtsOptions): Promise<NodeJS.ReadableStream> {
    if (existsSync(MOCK_MP3)) {
      return createReadStream(MOCK_MP3);
    }
    // Minimal silent-ish payload if asset missing
    return Readable.from([Buffer.alloc(256, 0)]);
  }
}
