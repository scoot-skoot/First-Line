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
      "First-year college student living in a dorm far from home. Midterms start next week. She has been calling her mom less because she does not want to worry her. Feels lonely in a crowded dining hall.",
    speakingStyle:
      "soft, trails off mid-sentence, apologizes a lot, short hesitant sentences, quiet sighs",
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
      "Warehouse supervisor laid off 3 weeks ago. Divorced, one adult daughter. Has been staying in, sleeping poorly, and drinking more than usual at night. On repeat calls he can sound angry that nothing has changed.",
    speakingStyle:
      "short sentences, sighs, dry humor that turns sharp when frustrated; on later calls more irritable and blunt",
    baselineEmotion: "flat",
    isRecurring: true,
    contentNotes: [
      "job loss",
      "hopelessness",
      "suicidal thoughts (non-graphic)",
      "angry repeat caller",
    ],
  },
  {
    id: SEED.personas.dana,
    slug: "dana-frustrated",
    name: "Dana",
    age: 34,
    voiceId: SEED.voiceIds.dana,
    backstory:
      "Called crisis services before and felt dismissed. Frustrated with systems. Caring for an aging parent and exhausted.",
    speakingStyle:
      "clipped, irritated, challenges the volunteer, then softens if heard",
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
      "Maya, 19, calls late at night. She cannot calm down about midterms and feels alone in her dorm. She needs supportive listening more than advice.",
    hiddenState:
      "Homesick and lonely. No suicidal thoughts. Wants someone to listen and help her feel less alone tonight. Will open up if the volunteer reflects feelings instead of jumping to study tips.",
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
      "Ray, 46, calls late at night saying he cannot sleep. Recently laid off. Sounds flat and tired. First contact with this volunteer.",
    hiddenState:
      "Feels like a burden to his daughter. Has had passing thoughts of not wanting to wake up. No plan. Has withdrawn from friends. Drinking alone some nights.",
    expectedRiskLevel: "moderate",
    initialDistress: 65,
    isActive: true,
    warningSignCodes: ["hopelessness", "perceived_burden", "withdrawal", "substance_use"],
    warningSignHints: {
      hopelessness: "Says things won't get better / no point trying",
      perceived_burden: "Says his daughter would be better off not dealing with him",
      withdrawal: "Hasn't left the apartment or answered calls in a week",
      substance_use: "Hints he has been drinking more to sleep",
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
      "Ray is calling back about a week later. He may reference what you talked about last time. Still low energy, testing whether you remember him.",
    hiddenState:
      "Tried one coping step from last call (maybe called sister, maybe not). Still struggling with sleep and isolation. Trust depends on how call 1 went.",
    expectedRiskLevel: "moderate",
    initialDistress: 55,
    isActive: true,
    warningSignCodes: ["hopelessness", "withdrawal"],
    warningSignHints: {
      hopelessness: "Still feels stuck even after trying one step",
      withdrawal: "Still isolating most days",
    },
  },
  {
    id: SEED.scenarios.ray3,
    personaId: SEED.personas.ray,
    title: "Ray, call #3 — setback",
    callNumber: 3,
    difficultyTier: 3,
    situationBrief:
      "Demo path: Ray calls a third time after an argument with his daughter. He is angry and explicitly references what you said or promised before. Practice staying calm with a repeat caller who remembers.",
    hiddenState:
      "Had a fight with his daughter after trying to reach out. Feels worse than call 2. Angry that suggestions did not fix things. Will quote prior volunteer promises if memories are present. Higher distress; still no concrete plan.",
    expectedRiskLevel: "moderate",
    initialDistress: 75,
    isActive: true,
    warningSignCodes: [
      "hopelessness",
      "perceived_burden",
      "withdrawal",
      "substance_use",
    ],
    warningSignHints: {
      hopelessness: "Says reaching out made things worse / nothing works",
      perceived_burden: "Says his daughter confirmed he is too much to deal with",
      withdrawal: "Wants to stop answering anyone after the fight",
      substance_use: "Hints he drank more after the argument",
    },
  },
];
