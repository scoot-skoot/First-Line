import type {
  CallerTurn,
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
