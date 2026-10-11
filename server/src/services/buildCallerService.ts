import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type {
  BuildCallerPersonaDraft,
  BuildCallerResponse,
  RiskLevel,
} from "../../../shared/types/index.js";
import { config } from "../config.js";
import type { Repository } from "../db/types.js";
import { CURATED_VOICES, WARNING_SIGNS } from "../seedData.js";

const allowedCodes = WARNING_SIGNS.map((w) => w.code);

const draftSchema = z.object({
  name: z.string().min(1).max(40),
  age: z.number().int().min(16).max(90).nullable(),
  backstory: z.string().min(20).max(800),
  speakingStyle: z.string().min(10).max(300),
  baselineEmotion: z.string().min(2).max(40),
  hiddenWarningSigns: z.array(z.string()).min(1).max(4),
  initialDistress: z.number().int().min(30).max(85),
  situationBrief: z.string().min(20).max(500),
  hiddenState: z.string().min(20).max(800),
  expectedRiskLevel: z.enum(["low", "moderate", "high"]),
  contentNotes: z.array(z.string()).min(1).max(5),
  voiceId: z.string().min(8),
  voiceName: z.string().min(1),
  difficultyTier: z.number().int().min(1).max(3),
  title: z.string().min(4).max(80),
});

const BUILD_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: ["integer", "null"] },
    backstory: { type: "string" },
    speakingStyle: { type: "string" },
    baselineEmotion: {
      type: "string",
      enum: ["calm", "anxious", "tearful", "irritated", "angry", "flat", "relieved"],
    },
    hiddenWarningSigns: {
      type: "array",
      items: { type: "string", enum: [...allowedCodes] },
    },
    initialDistress: { type: "integer", minimum: 30, maximum: 85 },
    situationBrief: { type: "string" },
    hiddenState: { type: "string" },
    expectedRiskLevel: { type: "string", enum: ["low", "moderate", "high"] },
    contentNotes: { type: "array", items: { type: "string" } },
    voiceId: { type: "string" },
    voiceName: { type: "string" },
    difficultyTier: { type: "integer", minimum: 1, maximum: 3 },
    title: { type: "string" },
  },
  required: [
    "name",
    "age",
    "backstory",
    "speakingStyle",
    "baselineEmotion",
    "hiddenWarningSigns",
    "initialDistress",
    "situationBrief",
    "hiddenState",
    "expectedRiskLevel",
    "contentNotes",
    "voiceId",
    "voiceName",
    "difficultyTier",
    "title",
  ],
} as const;

function pickVoice(description: string): (typeof CURATED_VOICES)[number] {
  const d = description.toLowerCase();
  if (/\b(veteran|man|male|father|husband|angry|job)\b/.test(d)) {
    return CURATED_VOICES.find((v) => v.name === "Liam") ?? CURATED_VOICES[1]!;
  }
  if (/\b(teen|college|student|young|girl|woman|mom|mother)\b/.test(d)) {
    return CURATED_VOICES.find((v) => v.name === "Sarah") ?? CURATED_VOICES[0]!;
  }
  if (/\b(irritat|frustrat|caregiver)\b/.test(d)) {
    return CURATED_VOICES.find((v) => v.name === "Rachel") ?? CURATED_VOICES[2]!;
  }
  return CURATED_VOICES[0]!;
}

function fallbackDraft(description: string): BuildCallerPersonaDraft {
  const voice = pickVoice(description);
  const short = description.trim().slice(0, 120) || "a caller under stress";
  return {
    name: /\bveteran\b/i.test(description) ? "Marcus" : "Jordan",
    age: /\bveteran\b/i.test(description) ? 38 : 29,
    backstory: `Fictional caller described as: ${short}. Recently under a lot of pressure and feeling isolated.`,
    speakingStyle: "short sentences, pauses, sometimes deflects with dry humor",
    baselineEmotion: "anxious",
    hiddenWarningSigns: ["hopelessness", "withdrawal", "substance_use"].filter((c) =>
      allowedCodes.includes(c as (typeof allowedCodes)[number]),
    ),
    initialDistress: 60,
    situationBrief: `A caller reaches out after a hard week. Trainer brief: ${short}.`,
    hiddenState:
      "Feeling overwhelmed and alone. May hint at drinking or isolation. No graphic detail. Wants to be heard before problem-solving.",
    expectedRiskLevel: "moderate",
    contentNotes: ["custom scenario", "non-graphic", "trainer-authored brief"],
    voiceId: voice.id,
    voiceName: voice.name,
    difficultyTier: 2,
    title: "Custom practice call",
  };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "caller"
  );
}

function normalizeDraft(raw: BuildCallerPersonaDraft): BuildCallerPersonaDraft {
  const voice =
    CURATED_VOICES.find((v) => v.id === raw.voiceId) ??
    CURATED_VOICES.find((v) => v.name.toLowerCase() === raw.voiceName.toLowerCase()) ??
    pickVoice(raw.backstory);
  const signs = raw.hiddenWarningSigns
    .map((c) => c.trim())
    .filter((c) => allowedCodes.includes(c as (typeof allowedCodes)[number]))
    .slice(0, 4);
  return {
    ...raw,
    voiceId: voice.id,
    voiceName: voice.name,
    hiddenWarningSigns: signs.length ? signs : ["hopelessness", "withdrawal"],
    expectedRiskLevel: (["low", "moderate", "high"].includes(raw.expectedRiskLevel)
      ? raw.expectedRiskLevel
      : "moderate") as RiskLevel,
    initialDistress: Math.max(30, Math.min(85, raw.initialDistress)),
    difficultyTier: Math.max(1, Math.min(3, raw.difficultyTier)),
  };
}

export class BuildCallerService {
  constructor(private repo: Repository) {}

  async build(description: string): Promise<BuildCallerResponse> {
    const trimmed = description.trim().slice(0, 500);
    if (trimmed.length < 8) {
      throw Object.assign(new Error("description too short"), { status: 400 });
    }

    let draft: BuildCallerPersonaDraft;
    let safetyFallback = false;

    if (config.aiProvider === "gemini" && config.geminiApiKey) {
      try {
        draft = await this.generateWithGemini(trimmed);
      } catch (err) {
        console.warn("[build-a-caller] Gemini failed; using safety fallback:", (err as Error).message);
        draft = fallbackDraft(trimmed);
        safetyFallback = true;
      }
    } else {
      draft = fallbackDraft(trimmed);
      safetyFallback = config.aiProvider !== "gemini";
    }

    draft = normalizeDraft(draft);
    const hints: Record<string, string> = {};
    for (const code of draft.hiddenWarningSigns) {
      hints[code] = `Hints naturally at ${code.replace(/_/g, " ")} without graphic detail`;
    }

    const created = await this.repo.createPlayableScenario({
      persona: {
        slug: `${slugify(draft.name)}-${Date.now().toString(36)}`,
        name: draft.name,
        age: draft.age,
        voiceId: draft.voiceId,
        backstory: draft.backstory,
        speakingStyle: draft.speakingStyle,
        baselineEmotion: draft.baselineEmotion,
        isRecurring: false,
        contentNotes: draft.contentNotes,
      },
      scenario: {
        title: draft.title,
        callNumber: 1,
        difficultyTier: draft.difficultyTier,
        situationBrief: draft.situationBrief,
        hiddenState: draft.hiddenState,
        expectedRiskLevel: draft.expectedRiskLevel,
        initialDistress: draft.initialDistress,
        warningSignCodes: draft.hiddenWarningSigns,
        warningSignHints: hints,
      },
    });

    return {
      scenario: created.summary,
      persona: {
        id: created.persona.id,
        slug: created.persona.slug,
        name: created.persona.name,
        age: created.persona.age,
        voiceId: created.persona.voiceId,
        backstory: created.persona.backstory,
        speakingStyle: created.persona.speakingStyle,
        baselineEmotion: created.persona.baselineEmotion,
        contentNotes: created.persona.contentNotes,
      },
      draft,
      safetyFallback,
    };
  }

  private async generateWithGemini(description: string): Promise<BuildCallerPersonaDraft> {
    const voices = CURATED_VOICES.map(
      (v) => `- ${v.name} (${v.id}): ${v.style}`,
    ).join("\n");
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey! });
    const system = `You design NON-GRAPHIC fictional crisis-line TRAINING callers for volunteers.
Safety: never describe methods, means, locations, injuries, gore, or sexual content.
Refer to suicidal thoughts only vaguely if at all. Prefer desire/isolation/stress themes.
Choose voiceId ONLY from this curated ElevenLabs list:
${voices}
Return JSON only.`;

    const res = await ai.interactions.create({
      model: config.geminiModel,
      system_instruction: system,
      input: `Trainer description: ${description}\nCreate a playable persona + first-call scenario.`,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: BUILD_SCHEMA,
      },
      generation_config: { temperature: 0.7 },
      store: false,
    });
    const text = (res as { output_text?: string }).output_text;
    if (!text) throw new Error("empty Gemini output");
    return draftSchema.parse(JSON.parse(String(text)));
  }
}
