import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import "../../src/config.js";
import { printResult, timed } from "./_util.js";

async function main(): Promise<boolean> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    printResult("tts", false, "missing env ELEVENLABS_API_KEY", 0);
    return false;
  }
  const voiceId =
    process.env.ELEVENLABS_DEFAULT_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
  try {
    const { value: bytes, ms } = await timed(async () => {
      const el = new ElevenLabsClient({ apiKey: key });
      const audio = await el.textToSpeech.stream(voiceId, {
        text: "This is a SteadyLine voice test.",
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
      const buf = Buffer.concat(chunks);
      await pipeline(Readable.from(buf), createWriteStream("/tmp/steadyline-smoke.mp3"));
      return buf.length;
    });
    const ok = bytes > 1024;
    printResult("tts", ok, ok ? `${bytes} bytes` : `only ${bytes} bytes`, ms);
    return ok;
  } catch (err) {
    printResult("tts", false, (err as Error).message.slice(0, 120), 0);
    return false;
  }
}

const ok = await main();
process.exit(ok ? 0 : 1);
