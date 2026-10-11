import { BackboardClient } from "backboard-sdk";
import { config } from "../config.js";
import type { Repository } from "../db/types.js";
import type { CallerMemory } from "./types.js";

type AssistantCacheEntry =
  | { status: "ready"; assistantId: string }
  | { status: "failed"; at: number; reason: string };

/**
 * E1: one Backboard assistant per (trainee, persona).
 * Docs: https://backboard-docs.docsalot.dev/sdk/assistants.md
 * Memory: https://backboard-docs.docsalot.dev/sdk/memory.md
 *
 * Failures are cached per pair so a broken ensureAssistant cannot block every turn.
 */
export class BackboardMemory implements CallerMemory {
  private client: BackboardClient;
  private repo: Repository;
  private assistantCache = new Map<string, AssistantCacheEntry>();

  constructor(repo: Repository, apiKey = config.backboardApiKey) {
    if (!apiKey) throw new Error("BACKBOARD_API_KEY required for BackboardMemory");
    this.client = new BackboardClient({ apiKey });
    this.repo = repo;
  }

  private cacheKey(traineeId: string, personaId: string): string {
    return `${traineeId}:${personaId}`;
  }

  private async ensureAssistant(
    traineeId: string,
    personaId: string,
  ): Promise<string | null> {
    const key = this.cacheKey(traineeId, personaId);
    const cached = this.assistantCache.get(key);
    if (cached?.status === "ready") return cached.assistantId;
    if (cached?.status === "failed") {
      // Stop retrying for this process lifetime once ensureAssistant fails.
      return null;
    }

    try {
      const rel = await this.repo.getCallerRelationship(traineeId, personaId);
      if (rel?.backboardAssistantId) {
        this.assistantCache.set(key, {
          status: "ready",
          assistantId: rel.backboardAssistantId,
        });
        return rel.backboardAssistantId;
      }

      const a = await this.client.createAssistant({
        name: `firstline:${traineeId.slice(0, 8)}:${personaId.slice(0, 8)}`,
        system_prompt: "Memory store for a simulated crisis-line caller persona.",
      });
      const id =
        (a as { assistantId?: string; assistant_id?: string }).assistantId ??
        (a as { assistant_id?: string }).assistant_id;
      if (!id) throw new Error("createAssistant returned no id");
      await this.repo.upsertCallerRelationship(traineeId, personaId, {
        backboardAssistantId: id,
        // Explicit 0 so NOT NULL is satisfied even if DB default is missing.
        callsCompleted: rel?.callsCompleted ?? 0,
      });
      this.assistantCache.set(key, { status: "ready", assistantId: id });
      return id;
    } catch (err) {
      const reason = (err as Error).message;
      console.warn("[backboard] ensureAssistant failed:", reason);
      this.assistantCache.set(key, {
        status: "failed",
        at: Date.now(),
        reason,
      });
      return null;
    }
  }

  async recall(traineeId: string, personaId: string): Promise<string[]> {
    try {
      const assistantId = await this.ensureAssistant(traineeId, personaId);
      if (!assistantId) return [];
      const found = await this.client.searchMemories(
        assistantId,
        "previous calls with the volunteer",
        10,
      );
      const memories = (found as { memories?: { content?: string }[] }).memories ?? [];
      return memories
        .map((m) => m.content)
        .filter((c): c is string => typeof c === "string" && c.length > 0);
    } catch (err) {
      console.warn("[backboard] recall failed:", (err as Error).message);
      return [];
    }
  }

  async remember(
    traineeId: string,
    personaId: string,
    facts: string[],
  ): Promise<void> {
    try {
      const assistantId = await this.ensureAssistant(traineeId, personaId);
      if (!assistantId) return;
      for (const content of facts.slice(0, 6)) {
        await this.client.addMemory(assistantId, {
          content,
          metadata: { source: "firstline" },
        });
      }
    } catch (err) {
      console.warn("[backboard] remember failed:", (err as Error).message);
    }
  }
}
