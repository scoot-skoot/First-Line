import { BackboardClient } from "backboard-sdk";
import "../../src/config.js";
import { formatError, printResult, timed } from "./_util.js";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<boolean> {
  const key = process.env.BACKBOARD_API_KEY;
  if (!key) {
    printResult("backboard", false, "missing env BACKBOARD_API_KEY", 0);
    return false;
  }
  try {
    const { value, ms } = await timed(async () => {
      const bb = new BackboardClient({ apiKey: key });
      const name = `firstline-smoke-${Date.now()}`;
      const a = await bb.createAssistant({
        name,
        system_prompt: "Memory store for First Line smoke test.",
      });
      const assistantId =
        (a as { assistantId?: string }).assistantId ??
        (a as { assistant_id?: string }).assistant_id;
      if (!assistantId) throw new Error("no assistantId");

      await bb.addMemory(assistantId, {
        content: "Smoke fact: the volunteer suggested calling my sister.",
        metadata: { source: "smoke" },
      });

      let searchStatus: "found" | "pending" = "pending";
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        const found = await bb.searchMemories(
          assistantId,
          "previous calls with the volunteer",
          10,
        );
        const memories =
          (found as { memories?: { content?: string }[] }).memories ?? [];
        if (
          memories.some((m) =>
            String(m.content ?? "").toLowerCase().includes("sister"),
          )
        ) {
          searchStatus = "found";
          break;
        }
        await sleep(1000);
      }

      await bb.deleteAssistant(assistantId);
      return searchStatus;
    });
    printResult("backboard", true, `(search: ${value})`, ms);
    return true;
  } catch (err) {
    printResult("backboard", false, formatError(err), 0);
    return false;
  }
}

const ok = await main();
process.exit(ok ? 0 : 1);
