import { RAY_DEMO_MEMORIES, SEED } from "../seedData.js";
import type { Repository } from "../db/types.js";
import type { CallerMemory } from "./types.js";

/**
 * Postgres / in-memory session-history fallback when Backboard is unavailable
 * or MEMORY_PROVIDER=none. Seeds a reliable Ray call #3 demo path.
 */
export class LocalMemory implements CallerMemory {
  constructor(private repo: Repository) {}

  async recall(traineeId: string, personaId: string): Promise<string[]> {
    try {
      const facts = await this.repo.listLocalMemories(traineeId, personaId);
      if (facts.length > 0) {
        return facts.map((f) => f.content);
      }
      // Reliable demo path: Demo Trainee + Ray always has seed memories.
      if (
        traineeId === SEED.traineeId &&
        personaId === SEED.personas.ray
      ) {
        return [...RAY_DEMO_MEMORIES];
      }
      return [];
    } catch (err) {
      console.warn("[local-memory] recall failed:", (err as Error).message);
      return [];
    }
  }

  async remember(
    traineeId: string,
    personaId: string,
    facts: string[],
  ): Promise<void> {
    try {
      await this.repo.appendLocalMemories(traineeId, personaId, facts, "session");
      const rel = await this.repo.getCallerRelationship(traineeId, personaId);
      await this.repo.upsertCallerRelationship(traineeId, personaId, {
        callsCompleted: (rel?.callsCompleted ?? 0) + 1,
      });
    } catch (err) {
      console.warn("[local-memory] remember failed:", (err as Error).message);
    }
  }
}
