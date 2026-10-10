export interface CallerMemory {
  recall(traineeId: string, personaId: string): Promise<string[]>;
  remember(traineeId: string, personaId: string, facts: string[]): Promise<void>;
}
