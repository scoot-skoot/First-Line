import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { buildContainer } from "./container.js";
import { buildCallerRouter } from "./routes/buildCaller.js";
import { healthRouter } from "./routes/health.js";
import { readinessRouter } from "./routes/readiness.js";
import { scenariosRouter } from "./routes/scenarios.js";
import { sessionsRouter } from "./routes/sessions.js";
import { traineesRouter } from "./routes/trainees.js";

const container = buildContainer();
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api", healthRouter(container));
app.use("/api", traineesRouter(container));
app.use("/api", readinessRouter(container));
app.use("/api", scenariosRouter(container));
app.use("/api", buildCallerRouter(container));
app.use("/api", sessionsRouter(container));

// Production / Render: serve the Vite build from the same origin as /api.
// Compiled file lives at server/dist/server/src/index.js → repo root is ../../../..
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(__dirname, "../../../../web/dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist, { index: false, maxAge: "1h" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(webDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
  console.log(`[static] serving UI from ${webDist}`);
} else {
  console.warn(`[static] web/dist not found at ${webDist} (API-only mode)`);
}

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("[express]", err.message);
    res.status(500).json({
      error: { code: "INTERNAL", message: "Unexpected server error", details: {} },
    });
  },
);

app.listen(config.port, () => {
  console.log(`First Line server on http://localhost:${config.port}`);
  console.log(
    `providers ai=${container.providers.ai} voice=${container.providers.voice} memory=${container.providers.memory} repo=${container.providers.repo}`,
  );
});
