import type { CallerMemory } from "./types.js";

export class NoopMemory implements CallerMemory {
  async recall(_traineeId: string, _personaId: string): Promise<string[]> {
    return [];
  }
  async remember(
    _traineeId: string,
    _personaId: string,
    _facts: string[],
  ): Promise<void> {
    // no-op
  }
}
