/** Fixed seed IDs shared by memoryRepository and db/seed.sql */
export const SEED = {
  traineeId: "a0000000-0000-4000-8000-000000000001",
  personas: {
    maya: "b0000000-0000-4000-8000-000000000001",
    ray: "b0000000-0000-4000-8000-000000000002",
    dana: "b0000000-0000-4000-8000-000000000003",
  },
  scenarios: {
    maya: "c0000000-0000-4000-8000-000000000001",
    ray: "c0000000-0000-4000-8000-000000000002",
    dana: "c0000000-0000-4000-8000-000000000003",
    ray2: "c0000000-0000-4000-8000-000000000004",
    ray3: "c0000000-0000-4000-8000-000000000005",
  },
  /** Premade ElevenLabs voices: Sarah (Maya), Liam (Ray), Rachel (Dana). */
  voiceIds: {
    maya: "EXAVITQu4vr4xnSDxMaL", // Sarah
    ray: "TX3LPaxmHKxFdv7VOQHJ", // Liam
    dana: "21m00Tcm4TlvDq8ikWAM", // Rachel
  },
} as const;

/** Curated ElevenLabs premade voices for Build-a-Caller. */
export const CURATED_VOICES = [
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    style: "young adult, soft, warm",
  },
  {
    id: "TX3LPaxmHKxFdv7VOQHJ",
    name: "Liam",
    style: "middle-aged, low, tired or angry",
  },
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    style: "adult, clear, firm",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    style: "adult male, steady",
  },
  {
    id: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda",
    style: "adult, thoughtful",
  },
] as const;

export const WARNING_SIGNS = [
  { code: "hopelessness", label: "Hopelessness", fcp: "desire" },
  { code: "perceived_burden", label: "Perceived burden", fcp: "desire" },
  { code: "recent_loss", label: "Recent loss", fcp: "desire" },
  { code: "withdrawal", label: "Withdrawal / isolation", fcp: "desire" },
  { code: "giving_things_away", label: "Giving things away", fcp: "intent" },
  { code: "access_to_means", label: "Access to means", fcp: "capability" },
  { code: "prior_attempt", label: "Prior attempt", fcp: "capability" },
  { code: "substance_use", label: "Substance use", fcp: "capability" },
] as const;

/** Demo facts Ray remembers on call #3 (reliable demo path). */
export const RAY_DEMO_MEMORIES = [
  "Last time you suggested I try calling my sister this week.",
  "I told you I lost my warehouse job three weeks ago and couldn't sleep.",
  "You asked carefully whether I'd been having thoughts of not wanting to wake up, and I said sometimes.",
  "We talked about me feeling like a burden to my daughter.",
] as const;
