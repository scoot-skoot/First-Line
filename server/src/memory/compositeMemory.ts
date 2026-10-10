import type { CallerMemory } from "./types.js";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Prefer Backboard; on timeout/error fall back to session-history LocalMemory.
 * Tracks which source last succeeded for the "Caller remembers" chip.
 */
export class CompositeMemory implements CallerMemory {
  lastSource: "backboard" | "session_history" | "seed" | "none" = "none";

  constructor(
    private primary: CallerMemory | null,
    private fallback: CallerMemory,
    private timeoutMs = 2500,
  ) {}

  async recall(traineeId: string, personaId: string): Promise<string[]> {
    if (this.primary) {
      try {
        const facts = await withTimeout(
          this.primary.recall(traineeId, personaId),
          this.timeoutMs,
          "backboard recall",
        );
        if (facts.length > 0) {
          this.lastSource = "backboard";
          return facts;
        }
      } catch (err) {
        console.warn(
          "[memory] Backboard recall failed; using session history:",
          (err as Error).message,
        );
      }
    }

    const fallbackFacts = await this.fallback.recall(traineeId, personaId);
    if (fallbackFacts.length > 0) {
      // Seed facts for Ray demo path are indistinguishable here; mark seed if
      // primary was absent and we got the known demo length from LocalMemory.
      this.lastSource = this.primary ? "session_history" : "seed";
      // Prefer session_history label when MEMORY_PROVIDER=none but facts came
      // from prior remember() writes; LocalMemory still returns seed for Ray.
      if (!this.primary) this.lastSource = "session_history";
      return fallbackFacts;
    }
    this.lastSource = "none";
    return [];
  }

  async remember(
    traineeId: string,
    personaId: string,
    facts: string[],
  ): Promise<void> {
    // Always persist locally so UI/demo works without Backboard.
    await this.fallback.remember(traineeId, personaId, facts);
    if (this.primary) {
      try {
        await withTimeout(
          this.primary.remember(traineeId, personaId, facts),
          this.timeoutMs,
          "backboard remember",
        );
      } catch (err) {
        console.warn(
          "[memory] Backboard remember failed (local copy kept):",
          (err as Error).message,
        );
      }
    }
  }
}
