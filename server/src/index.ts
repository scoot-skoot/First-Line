import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { buildContainer } from "./container.js";
import { healthRouter } from "./routes/health.js";
import { scenariosRouter } from "./routes/scenarios.js";
import { sessionsRouter } from "./routes/sessions.js";
import { traineesRouter } from "./routes/trainees.js";

const container = buildContainer();
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api", healthRouter(container));
app.use("/api", traineesRouter(container));
app.use("/api", scenariosRouter(container));
app.use("/api", sessionsRouter(container));

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
  console.log(`SteadyLine server on http://localhost:${config.port}`);
  console.log(
    `providers ai=${container.providers.ai} voice=${container.providers.voice} memory=${container.providers.memory} repo=${container.providers.repo}`,
  );
});
