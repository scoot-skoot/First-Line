import type {
  CallerTurn,
  InterruptionKind,
  Persona,
  Scenario,
  ScoringOutput,
  TurnRecord,
} from "../../../shared/types/index.js";

export interface CallerTurnInput {
  persona: Persona;
  scenario: Scenario;
  history: TurnRecord[];
  currentDistress: number;
  memories: string[];
  isOpening: boolean;
  /** When set, produce a short interruption line (not a full reply). */
  interruption?: {
    kind: InterruptionKind;
    /** Trainee cut off the caller's previous audio. */
    bargeInCutOff?: boolean;
    partialTraineeText?: string;
  };
  /** Full reply, but caller knows their previous audio was barged into. */
  priorCallerCutOff?: boolean;
}

export interface CallerModel {
  nextTurn(input: CallerTurnInput): Promise<CallerTurn>;
}

export interface ScoringInput {
  persona: Persona;
  scenario: Scenario;
  history: TurnRecord[];
}

export interface Scorer {
  score(input: ScoringInput): Promise<ScoringOutput>;
}
