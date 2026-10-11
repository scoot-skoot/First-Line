import { GoogleGenAI } from "@google/genai";
import type { CallerTurn } from "../../../shared/types/index.js";
import { config } from "../config.js";
import { callerTurnSchema } from "../validation.js";
import { CALLER_TURN_JSON_SCHEMA } from "./schemas.js";
import { renderCallerSystem, transcriptAsText } from "./promptUtils.js";
import type { CallerModel, CallerTurnInput } from "./types.js";

/**
 * Gemini caller via Interactions API.
 * Docs: https://ai.google.dev/gemini-api/docs/interactions-overview
 * Structured output: https://ai.google.dev/gemini-api/docs/structured-output
 */
export class GeminiCaller implements CallerModel {
  private ai: GoogleGenAI;

  constructor(apiKey = config.geminiApiKey) {
    if (!apiKey) throw new Error("GEMINI_API_KEY required for GeminiCaller");
    this.ai = new GoogleGenAI({ apiKey });
  }

  async nextTurn(input: CallerTurnInput): Promise<CallerTurn> {
    const system = renderCallerSystem(
      input.persona,
      input.scenario,
      input.memories,
      input.currentDistress,
    );
    const userInput = input.isOpening
      ? "The call just connected. Produce the caller's opening line as JSON."
      : transcriptAsText(input.history) + "\n\nProduce the next CALLER turn as JSON.";

    // Fast path: flash model, no thinking budget, enough tokens so caller_line
    // is never truncated mid-sentence by max_output_tokens.
    const res = await this.ai.interactions.create({
      model: config.geminiModel,
      system_instruction: system,
      input: userInput,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: CALLER_TURN_JSON_SCHEMA,
      },
      generation_config: {
        temperature: 0.9,
        max_output_tokens: 1024,
      } as Record<string, unknown>,
      store: false,
    });

    const text = (res as { output_text?: string }).output_text;
    if (!text || !String(text).trim()) {
      throw new Error("Gemini returned empty output_text");
    }
    const parsed = JSON.parse(String(text)) as Record<string, unknown>;
    // Coerce floats / missing fields before zod so a slightly messy model
    // response still yields a full caller_line for transcript + TTS.
    if (typeof parsed.distress === "number") {
      parsed.distress = Math.round(parsed.distress);
    }
    if (typeof parsed.trust === "number") {
      parsed.trust = Math.round(parsed.trust);
    }
    if (typeof parsed.caller_line === "string") {
      parsed.caller_line = parsed.caller_line.trim();
    }
    return callerTurnSchema.parse(parsed);
  }
}
