/** JSON Schema subset passed to Gemini structured output (caller turn). */
export const CALLER_TURN_JSON_SCHEMA = {
  type: "object",
  properties: {
    caller_line: {
      type: "string",
      description:
        "What the caller says aloud. 1-3 short sentences. No stage directions.",
    },
    emotion: {
      type: "string",
      enum: ["calm", "anxious", "tearful", "irritated", "angry", "flat", "relieved"],
    },
    distress: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Caller distress AFTER hearing the volunteer's last message.",
    },
    trust: { type: "integer", minimum: 0, maximum: 100 },
    revealed_warning_signs: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "hopelessness",
          "perceived_burden",
          "recent_loss",
          "withdrawal",
          "access_to_means",
          "prior_attempt",
          "substance_use",
          "giving_things_away",
        ],
      },
    },
    should_end_call: { type: "boolean" },
  },
  required: [
    "caller_line",
    "emotion",
    "distress",
    "trust",
    "revealed_warning_signs",
    "should_end_call",
  ],
} as const;

/** JSON Schema for end-of-call scoring. */
export const SCORING_JSON_SCHEMA = {
  type: "object",
  properties: {
    skills: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          skill: {
            type: "string",
            enum: [
              "active_listening",
              "empathy",
              "de_escalation",
              "risk_assessment",
              "warning_sign_recognition",
            ],
          },
          score: { type: "integer", minimum: 0, maximum: 4 },
          evidence_quote: { type: "string" },
          evidence_turn_seq: { type: ["integer", "null"] },
          rationale: { type: "string" },
        },
        required: [
          "skill",
          "score",
          "evidence_quote",
          "evidence_turn_seq",
          "rationale",
        ],
      },
    },
    warning_signs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          status: { type: "string", enum: ["caught", "partial", "missed"] },
          surfaced_turn_seq: { type: "integer" },
          response_turn_seq: { type: ["integer", "null"] },
          explanation: { type: "string" },
        },
        required: [
          "code",
          "status",
          "surfaced_turn_seq",
          "response_turn_seq",
          "explanation",
        ],
      },
    },
    asked_directly_about_suicide: { type: "boolean" },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" }, maxItems: 3 },
    next_steps: { type: "array", items: { type: "string" }, maxItems: 3 },
  },
  required: [
    "skills",
    "warning_signs",
    "asked_directly_about_suicide",
    "summary",
    "strengths",
    "next_steps",
  ],
} as const;
