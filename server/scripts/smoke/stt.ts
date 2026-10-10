import { Readable } from "node:stream";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import "../../src/config.js";
import { formatError, printResult, timed } from "./_util.js";

async function main(): Promise<boolean> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    printResult("stt", false, "missing env ELEVENLABS_API_KEY", 0);
    return false;
  }
  const voiceId =
    process.env.ELEVENLABS_DEFAULT_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
  try {
    const el = new ElevenLabsClient({ apiKey: key });
    let audioBuf: Buffer;
    try {
      const audio = await el.textToSpeech.stream(voiceId, {
        text: "testing one two three",
        modelId: process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2_5",
        outputFormat: "mp3_44100_128",
      });
      const nodeStream = Readable.fromWeb(
        audio as import("node:stream/web").ReadableStream,
      );
      const chunks: Buffer[] = [];
      for await (const chunk of nodeStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      audioBuf = Buffer.concat(chunks);
    } catch {
      printResult("stt", false, "(tts dependency)", 0);
      return false;
    }

    const { value: transcript, ms } = await timed(async () => {
      const result = await el.speechToText.convert({
        file: new Blob([audioBuf], { type: "audio/mpeg" }),
        modelId: process.env.ELEVENLABS_STT_MODEL ?? "scribe_v2",
      });
      return String((result as { text?: string }).text ?? "");
    });
    const ok = /testing/i.test(transcript);
    printResult("stt", ok, ok ? "" : `got "${transcript.slice(0, 40)}"`, ms);
    return ok;
  } catch (err) {
    printResult("stt", false, formatError(err), 0);
    return false;
  }
}

const ok = await main();
process.exit(ok ? 0 : 1);
