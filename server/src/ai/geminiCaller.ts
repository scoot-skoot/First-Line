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

    // VERIFY IN DOCS: generation_config keys (max output tokens, thinking level)
    // https://ai.google.dev/api/interactions-api
    // VERIFY IN DOCS: store=false is the stateless opt-out (confirmed in interactions-overview)
    const res = await this.ai.interactions.create({
      model: config.geminiModel,
      system_instruction: system,
      input: userInput,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: CALLER_TURN_JSON_SCHEMA,
      },
      generation_config: { temperature: 0.9 },
      store: false,
    });

    // VERIFY IN DOCS: status/finish fields for blocked output on interaction object
    const text = (res as { output_text?: string }).output_text;
    if (!text || !String(text).trim()) {
      throw new Error("Gemini returned empty output_text");
    }
    return callerTurnSchema.parse(JSON.parse(String(text)));
  }
}
