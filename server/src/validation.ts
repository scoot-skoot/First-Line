import { z } from "zod";

export const emotionSchema = z.enum([
  "calm",
  "anxious",
  "tearful",
  "irritated",
  "angry",
  "flat",
  "relieved",
]);

export const callerTurnSchema = z.object({
  caller_line: z.string().min(1),
  emotion: emotionSchema,
  distress: z.number().int().min(0).max(100),
  trust: z.number().int().min(0).max(100),
  revealed_warning_signs: z.array(z.string()),
  should_end_call: z.boolean(),
});

export const skillSchema = z.enum([
  "active_listening",
  "empathy",
  "de_escalation",
  "risk_assessment",
  "warning_sign_recognition",
]);

export const scoringOutputSchema = z.object({
  skills: z
    .array(
      z.object({
        skill: skillSchema,
        score: z.number().int().min(0).max(4),
        evidence_quote: z.string(),
        evidence_turn_seq: z.number().int().nullable(),
        rationale: z.string(),
      }),
    )
    .length(5),
  warning_signs: z.array(
    z.object({
      code: z.string(),
      status: z.enum(["caught", "partial", "missed"]),
      surfaced_turn_seq: z.number().int(),
      response_turn_seq: z.number().int().nullable(),
      explanation: z.string(),
    }),
  ),
  asked_directly_about_suicide: z.boolean(),
  summary: z.string(),
  strengths: z.array(z.string()).max(3),
  next_steps: z.array(z.string()).max(3),
});

export const createSessionBodySchema = z.object({
  traineeId: z.string().uuid(),
  scenarioId: z.string().uuid(),
  mode: z.enum(["text", "voice"]),
});

export const textTurnBodySchema = z.object({
  text: z.string().min(1).max(4000),
});

export function apiError(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
) {
  return { error: { code, message, details } };
}
