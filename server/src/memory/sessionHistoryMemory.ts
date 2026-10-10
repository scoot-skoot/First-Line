import { DEMO_RAY_MEMORIES } from "../db/seedEntities.js";
import type { Repository } from "../db/types.js";
import { SEED } from "../seedData.js";
import type { CallerMemory } from "./types.js";

/**
 * Fallback memory store: reconstruct short caller-POV facts from prior
 * completed sessions in Postgres / in-memory repo. Also injects seeded
 * Ray demo facts so call #3 works without Backboard.
 */
export class SessionHistoryMemory implements CallerMemory {
  private extras = new Map<string, string[]>();

  constructor(private repo: Repository) {}

  private key(traineeId: string, personaId: string) {
    return `${traineeId}::${personaId}`;
  }

  async recall(traineeId: string, personaId: string): Promise<string[]> {
    const out: string[] = [];

    // Seeded demo path for Ray callbacks
    if (traineeId === SEED.traineeId && personaId === SEED.personas.ray) {
      out.push(...DEMO_RAY_MEMORIES);
    }

    try {
      const fromRepo = await this.repo.recallSessionMemories?.(traineeId, personaId);
      if (fromRepo?.length) out.push(...fromRepo);
    } catch (err) {
      console.warn("[memory] session history recall failed:", (err as Error).message);
    }

    const extra = this.extras.get(this.key(traineeId, personaId)) ?? [];
    out.push(...extra);

    // Dedupe, keep order
    return [...new Set(out.map((s) => s.trim()).filter(Boolean))].slice(0, 10);
  }

  async remember(
    traineeId: string,
    personaId: string,
    facts: string[],
  ): Promise<void> {
    const k = this.key(traineeId, personaId);
    const prev = this.extras.get(k) ?? [];
    this.extras.set(k, [...prev, ...facts].slice(-12));
    try {
      await this.repo.upsertCallerRelationship(traineeId, personaId, {});
    } catch {
      /* ignore */
    }
  }
}
