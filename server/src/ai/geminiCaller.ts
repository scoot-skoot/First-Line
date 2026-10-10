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
    let userInput: string;
    if (input.interruption) {
      const kind = input.interruption.kind;
      const hints: Record<string, string> = {
        ptt_timeout:
          "The volunteer has been talking too long / holding the line. Cut in briefly.",
        silence:
          "The volunteer has been silent too long. Prompt them that you are still here.",
        barge_in:
          "The volunteer cut you off mid-sentence (barge-in). React briefly that you weren't finished.",
      };
      const partial = input.interruption.partialTraineeText
        ? `\nThey had started saying: "${input.interruption.partialTraineeText.slice(0, 200)}"`
        : "";
      const cut = input.interruption.bargeInCutOff
        ? "\nYour previous line was interrupted mid-audio."
        : "";
      userInput =
        transcriptAsText(input.history) +
        `\n\nINTERRUPTION (${kind}): ${hints[kind] ?? "Interrupt briefly."}${partial}${cut}\n` +
        "Produce ONE short interruption line as JSON (1 sentence preferred). Keep distress consistent. Do not end the call.";
    } else if (input.isOpening) {
      userInput =
        "The call just connected. Produce the caller's opening line as JSON.";
    } else {
      const cutOff =
        input.priorCallerCutOff ||
        input.history.some(
          (t) => t.state && (t.state as { bargeInCutOff?: boolean }).bargeInCutOff,
        );
      const bargeNote = cutOff
        ? "\nNote: the volunteer cut off your previous spoken line mid-audio. You may briefly acknowledge that, then respond to what they said."
        : "";
      userInput =
        transcriptAsText(input.history) +
        bargeNote +
        "\n\nProduce the next CALLER turn as JSON.";
    }

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
