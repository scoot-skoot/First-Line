import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Persona, Scenario, TurnRecord } from "../../../shared/types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const promptCache = new Map<string, string>();

export function loadPrompt(name: "caller.md" | "scorer.md"): string {
  const hit = promptCache.get(name);
  if (hit) return hit;
  const text = readFileSync(join(__dirname, "prompts", name), "utf8");
  promptCache.set(name, text);
  return text;
}

export function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}

export function renderCallerSystem(
  persona: Persona,
  scenario: Scenario,
  memories: string[],
  currentDistress: number,
): string {
  const warningList =
    scenario.warningSignCodes
      .map((c) => `- ${c}: ${scenario.warningSignHints[c] ?? ""}`)
      .join("\n") || "(none)";
  const mem =
    memories.length > 0
      ? memories.map((m) => `- ${m}`).join("\n")
      : "(none yet — first call with this volunteer)";

  return renderTemplate(loadPrompt("caller.md"), {
    name: persona.name,
    age: persona.age ?? "unknown",
    backstory: persona.backstory,
    speaking_style: persona.speakingStyle,
    baseline_emotion: persona.baselineEmotion,
    situation_brief: scenario.situationBrief,
    hidden_state: scenario.hiddenState,
    current_distress: currentDistress,
    warning_signs_list: warningList,
    memories: mem,
    call_number: scenario.callNumber,
  });
}

export function transcriptAsText(history: TurnRecord[]): string {
  if (history.length === 0) return "(call just connected — produce the opening line)";
  return history
    .map((t) => {
      const who = t.speaker === "trainee" ? "TRAINEE" : "CALLER";
      const d =
        t.speaker === "caller" && t.distress != null ? ` [distress=${t.distress}]` : "";
      return `${who}: ${t.text}${d}`;
    })
    .join("\n");
}

export function renderScorerSystem(
  scenario: Scenario,
  history: TurnRecord[],
): string {
  const surfaced: string[] = [];
  for (const t of history) {
    if (t.speaker === "caller") {
      for (const code of t.revealedWarningSigns) {
        surfaced.push(`${code} @ turn ${t.seq}`);
      }
    }
  }
  const transcript = history
    .map((t) => {
      const d = t.distress != null ? ` | distress=${t.distress}` : "";
      return `${t.seq} | ${t.speaker} | ${t.text}${d}`;
    })
    .join("\n");

  return renderTemplate(loadPrompt("scorer.md"), {
    expected_risk_level: scenario.expectedRiskLevel,
    surfaced_signs_with_turn_seq: surfaced.join("; ") || "(none surfaced)",
    transcript,
  });
}
