import { GoogleGenAI } from "@google/genai";
import "../../src/config.js";
import { CALLER_TURN_JSON_SCHEMA } from "../../src/ai/schemas.js";
import { callerTurnSchema } from "../../src/validation.js";
import { formatError, printResult, timed } from "./_util.js";

async function main(): Promise<boolean> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    printResult("gemini", false, "missing env GEMINI_API_KEY", 0);
    return false;
  }
  try {
    const { value, ms } = await timed(async () => {
      const ai = new GoogleGenAI({ apiKey: key });
      const res = await ai.interactions.create({
        model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
        system_instruction:
          "You are a fictional caller in a training simulator. Reply with JSON only. Non-graphic.",
        input:
          "Opening line for Maya, 19, anxious about exams. Produce caller JSON.",
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: CALLER_TURN_JSON_SCHEMA,
        },
        generation_config: { temperature: 0.7 },
        store: false,
      });
      const text = (res as { output_text?: string }).output_text;
      if (!text) throw new Error("empty output_text");
      return callerTurnSchema.parse(JSON.parse(String(text)));
    });
    const ok =
      typeof value.caller_line === "string" &&
      Number.isInteger(value.distress) &&
      value.distress >= 0 &&
      value.distress <= 100;
    printResult("gemini", ok, ok ? "" : "bad shape", ms);
    return ok;
  } catch (err) {
    printResult("gemini", false, formatError(err), 0);
    return false;
  }
}

const ok = await main();
process.exit(ok ? 0 : 1);
