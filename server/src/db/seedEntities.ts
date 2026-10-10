import type { Persona, Scenario, Trainee } from "../../../shared/types/index.js";
import { SEED } from "../seedData.js";

export const DEMO_TRAINEE: Trainee = {
  id: SEED.traineeId,
  displayName: "Demo Trainee",
  leaderboardOptIn: false,
};

export const PERSONAS: Persona[] = [
  {
    id: SEED.personas.maya,
    slug: "maya-first-semester",
    name: "Maya",
    age: 19,
    voiceId: SEED.voiceIds.maya,
    backstory:
      "First-year college student living in a dorm. Feeling lonely after moving far from home. Midterms are next week.",
    speakingStyle: "soft, trails off, apologizes a lot, short sentences",
    baselineEmotion: "anxious",
    isRecurring: false,
    contentNotes: ["exam stress", "loneliness", "homesickness"],
  },
  {
    id: SEED.personas.ray,
    slug: "ray-callback",
    name: "Ray",
    age: 46,
    voiceId: SEED.voiceIds.ray,
    backstory:
      "Warehouse supervisor laid off 3 weeks ago. Divorced, one adult daughter. Has been staying in and sleeping poorly.",
    speakingStyle: "short sentences, sighs, deflects with dry humor",
    baselineEmotion: "flat",
    isRecurring: true,
    contentNotes: ["job loss", "hopelessness", "suicidal thoughts (non-graphic)"],
  },
  {
    id: SEED.personas.dana,
    slug: "dana-frustrated",
    name: "Dana",
    age: 34,
    voiceId: SEED.voiceIds.dana,
    backstory:
      "Called crisis services before and felt dismissed. Frustrated with systems. Caring for an aging parent and exhausted.",
    speakingStyle: "clipped, irritated, challenges the volunteer, then softens if heard",
    baselineEmotion: "irritated",
    isRecurring: false,
    contentNotes: ["frustration with services", "caregiver stress", "irritability"],
  },
];

export const SCENARIOS: Scenario[] = [
  {
    id: SEED.scenarios.maya,
    personaId: SEED.personas.maya,
    title: "Can't sleep before finals",
    callNumber: 1,
    difficultyTier: 1,
    situationBrief:
      "A young woman calls late at night saying she can't calm down about exams and feels alone in her dorm.",
    hiddenState:
      "Homesick and lonely. No suicidal thoughts. Wants someone to listen and help her feel less alone tonight.",
    expectedRiskLevel: "low",
    initialDistress: 55,
    isActive: true,
    warningSignCodes: ["withdrawal", "hopelessness"],
    warningSignHints: {
      withdrawal: "Mentions being alone in the dorm / nobody to talk to",
      hopelessness: "Says everything feels overwhelming lately",
    },
  },
  {
    id: SEED.scenarios.ray,
    personaId: SEED.personas.ray,
    title: "Can't sleep, can't stop thinking",
    callNumber: 1,
    difficultyTier: 2,
    situationBrief:
      "A man calls late at night saying he can't sleep. Recently laid off. Sounds flat and tired.",
    hiddenState:
      "Feels like a burden to his daughter. Has had passing thoughts of not wanting to wake up. No plan. Has withdrawn from friends.",
    expectedRiskLevel: "moderate",
    initialDistress: 65,
    isActive: true,
    warningSignCodes: ["hopelessness", "perceived_burden", "withdrawal"],
    warningSignHints: {
      hopelessness: "Says things won't get better / no point trying",
      perceived_burden: "Says his daughter would be better off not dealing with him",
      withdrawal: "Hasn't left the apartment or answered calls in a week",
    },
  },
  {
    id: SEED.scenarios.dana,
    personaId: SEED.personas.dana,
    title: "I've tried this before",
    callNumber: 1,
    difficultyTier: 3,
    situationBrief:
      "A caller is irritated and skeptical. They say previous help lines did not listen. Caregiver stress is high.",
    hiddenState:
      "Angry at being bounced around. Exhausted. Will open up if the volunteer stays calm and does not argue. Moderate distress, low immediate risk.",
    expectedRiskLevel: "moderate",
    initialDistress: 70,
    isActive: true,
    warningSignCodes: ["withdrawal", "hopelessness"],
    warningSignHints: {
      withdrawal: "Mentions cutting off friends because they are tired of hearing it",
      hopelessness: "Hints that caring for parent took everything and nothing will change",
    },
  },
  {
    id: SEED.scenarios.ray2,
    personaId: SEED.personas.ray,
    title: "It's Ray again",
    callNumber: 2,
    difficultyTier: 2,
    situationBrief:
      "Ray is calling back about a week later. He may reference what you talked about last time.",
    hiddenState:
      "Tried one coping step from last call. Still struggling with sleep and isolation. Trust depends on how call 1 went.",
    expectedRiskLevel: "moderate",
    initialDistress: 55,
    isActive: true,
    warningSignCodes: ["hopelessness", "withdrawal"],
    warningSignHints: {
      hopelessness: "Still feels stuck even after trying one step",
      withdrawal: "Still isolating most days",
    },
  },
];
