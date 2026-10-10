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
  },
  voiceIds: {
    maya: "EXAVITQu4vr4xnSDxMaL",
    ray: "EXAVITQu4vr4xnSDxMaL",
    dana: "EXAVITQu4vr4xnSDxMaL",
  },
} as const;

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
