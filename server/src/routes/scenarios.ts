import { Router } from "express";
import type { AppContainer } from "../container.js";
import { apiError } from "../validation.js";

export function scenariosRouter(container: AppContainer): Router {
  const r = Router();
  r.get("/scenarios", async (_req, res) => {
    try {
      const scenarios = await container.repo.listScenarios();
      res.json({ scenarios });
    } catch (err) {
      res.status(500).json(apiError("INTERNAL", (err as Error).message));
    }
  });
  return r;
}
