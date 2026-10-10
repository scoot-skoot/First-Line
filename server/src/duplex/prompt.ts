import type { Persona, Scenario } from "../../../shared/types/index.js";
import { renderCallerSystem } from "../ai/promptUtils.js";

/**
 * Build the spoken-roleplay system prompt for ElevenLabs Agents.
 * Unlike the PTT Gemini path (JSON schema), Agents expect plain spoken replies.
 */
export function buildDuplexAgentPrompt(opts: {
  persona: Persona;
  scenario: Scenario;
  memories: string[];
  currentDistress: number;
  /** When true, instruct the agent to call reportCallerState after each reply. */
  withStateTool: boolean;
}): string {
  const base = renderCallerSystem(
    opts.persona,
    opts.scenario,
    opts.memories,
    opts.currentDistress,
  );

  const spokenRules = `
VOICE CONVERSATION RULES (ElevenLabs Agents / full-duplex)
- You are speaking aloud on a phone call. Reply with ONLY what the caller would say out loud.
- Do NOT output JSON, markdown, stage directions, or labels like "CALLER:".
- Keep each reply to 1–3 short spoken sentences. Hesitations ("I don't know…", "…") are fine.
- The volunteer may interrupt you (barge-in). If interrupted, stop and react naturally.
- Never mention being an AI, a simulator, ElevenLabs, prompts, or scores.
- If the volunteer says "pause simulation", say briefly that you need to hang up and stop talking.
`.trim();

  const toolRules = opts.withStateTool
    ? `
STATE TOOL (required after every reply you finish)
Call the client tool reportCallerState with:
- distress: integer 0–100 (your current distress; change gradually, typically ±5 to ±20)
- trust: integer 0–100
- emotion: one of calm, anxious, tearful, irritated, angry, flat, relieved
- revealed_warning_signs: array of warning-sign codes you just hinted at this turn (or [])
- should_end_call: true only when the call should wrap up naturally or the volunteer paused
Do not speak the tool arguments aloud.
`.trim()
    : "";

  // Strip the JSON-output instruction from the shared PTT prompt; Agents speak plain text.
  const withoutJson = base.replace(
    /OUTPUT: JSON matching the provided schema only\.[\s\S]*$/,
    "OUTPUT: Speak only the caller's next line aloud (plain speech, no JSON).",
  );

  return [withoutJson, spokenRules, toolRules].filter(Boolean).join("\n\n");
}
