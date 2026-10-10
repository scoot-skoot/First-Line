import { BackboardClient } from "backboard-sdk";
import { config } from "../config.js";
import type { Repository } from "../db/types.js";
import { SessionHistoryMemory } from "./sessionHistoryMemory.js";
import type { CallerMemory } from "./types.js";

/**
 * E1: one Backboard assistant per (trainee, persona).
 * Falls back to SessionHistoryMemory when Backboard is empty/slow/errors
 * so Ray call #3 still has "Caller remembers" chips.
 */
export class BackboardMemory implements CallerMemory {
  private client: BackboardClient;
  private repo: Repository;
  private fallback: SessionHistoryMemory;

  constructor(repo: Repository, apiKey = config.backboardApiKey) {
    if (!apiKey) throw new Error("BACKBOARD_API_KEY required for BackboardMemory");
    this.client = new BackboardClient({ apiKey });
    this.repo = repo;
    this.fallback = new SessionHistoryMemory(repo);
  }

  private async ensureAssistant(
    traineeId: string,
    personaId: string,
  ): Promise<string | null> {
    try {
      const rel = await this.repo.getCallerRelationship(traineeId, personaId);
      if (rel?.backboardAssistantId) return rel.backboardAssistantId;

      const a = await this.client.createAssistant({
        name: `steadyline:${traineeId.slice(0, 8)}:${personaId.slice(0, 8)}`,
        system_prompt: "Memory store for a simulated crisis-line caller persona.",
      });
      const id =
        (a as { assistantId?: string; assistant_id?: string }).assistantId ??
        (a as { assistant_id?: string }).assistant_id;
      if (!id) throw new Error("createAssistant returned no id");
      await this.repo.upsertCallerRelationship(traineeId, personaId, {
        backboardAssistantId: id,
      });
      return id;
    } catch (err) {
      console.warn("[backboard] ensureAssistant failed:", (err as Error).message);
      return null;
    }
  }

  async recall(traineeId: string, personaId: string): Promise<string[]> {
    const fallback = await this.fallback.recall(traineeId, personaId);
    try {
      const assistantId = await this.ensureAssistant(traineeId, personaId);
      if (!assistantId) return fallback;

      let memories: string[] = [];
      const deadline = Date.now() + 2500;
      while (Date.now() <= deadline) {
        const found = await this.client.searchMemories(
          assistantId,
          "previous calls with the volunteer promises suggestions sister",
          10,
        );
        memories = ((found as { memories?: { content?: string }[] }).memories ?? [])
          .map((m) => m.content)
          .filter((c): c is string => typeof c === "string" && c.length > 0);
        if (memories.length > 0) break;
        await new Promise((r) => setTimeout(r, 400));
      }

      if (memories.length === 0) return fallback;
      return [...new Set([...memories, ...fallback])].slice(0, 10);
    } catch (err) {
      console.warn("[backboard] recall failed, using fallback:", (err as Error).message);
      return fallback;
    }
  }

  async remember(
    traineeId: string,
    personaId: string,
    facts: string[],
  ): Promise<void> {
    await this.fallback.remember(traineeId, personaId, facts);
    try {
      const assistantId = await this.ensureAssistant(traineeId, personaId);
      if (!assistantId) return;
      for (const content of facts.slice(0, 6)) {
        await this.client.addMemory(assistantId, {
          content,
          metadata: { source: "steadyline" },
        });
      }
      const rel = await this.repo.getCallerRelationship(traineeId, personaId);
      await this.repo.upsertCallerRelationship(traineeId, personaId, {
        callsCompleted: (rel?.callsCompleted ?? 0) + 1,
      });
    } catch (err) {
      console.warn("[backboard] remember failed:", (err as Error).message);
    }
  }
}
