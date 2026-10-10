import { GoogleGenAI } from "@google/genai";
import type { ScoringOutput } from "../../../shared/types/index.js";
import { config } from "../config.js";
import { scoringOutputSchema } from "../validation.js";
import { SCORING_JSON_SCHEMA } from "./schemas.js";
import { renderScorerSystem } from "./promptUtils.js";
import type { Scorer, ScoringInput } from "./types.js";

export class GeminiScorer implements Scorer {
  private ai: GoogleGenAI;

  constructor(apiKey = config.geminiApiKey) {
    if (!apiKey) throw new Error("GEMINI_API_KEY required for GeminiScorer");
    this.ai = new GoogleGenAI({ apiKey });
  }

  async score(input: ScoringInput): Promise<ScoringOutput> {
    const system = renderScorerSystem(input.scenario, input.history);
    const attempt = async () => {
      const res = await this.ai.interactions.create({
        model: config.geminiScorerModel,
        system_instruction: system,
        input:
          "Score this training transcript. Return JSON matching the schema only.",
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: SCORING_JSON_SCHEMA,
        },
        generation_config: { temperature: 0.3 },
        store: false,
      });
      const text = (res as { output_text?: string }).output_text;
      if (!text || !String(text).trim()) {
        throw new Error("Gemini scorer returned empty output_text");
      }
      return scoringOutputSchema.parse(JSON.parse(String(text)));
    };

    try {
      return await attempt();
    } catch (err1) {
      console.warn("[scorer] first attempt failed, retrying:", (err1 as Error).message);
      return await attempt();
    }
  }
}
