import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scripts = ["gemini.ts", "tts.ts", "stt.ts", "backboard.ts", "db.ts"];

function run(script: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["tsx", join(__dirname, script)], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

let failed = 0;
for (const s of scripts) {
  const code = await run(s);
  if (code !== 0) failed += 1;
}
process.exit(failed > 0 ? 1 : 0);
