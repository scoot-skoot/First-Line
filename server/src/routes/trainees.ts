import { Router } from "express";
import type { AppContainer } from "../container.js";
import { apiError } from "../validation.js";

export function traineesRouter(container: AppContainer): Router {
  const r = Router();

  r.get("/trainees", async (_req, res) => {
    try {
      const trainees = await container.repo.listTrainees();
      res.json({
        trainees: trainees.map((t) => ({
          id: t.id,
          displayName: t.displayName,
        })),
      });
    } catch (err) {
      res.status(500).json(apiError("INTERNAL", (err as Error).message));
    }
  });

  r.get("/trainees/:id/sessions", async (req, res) => {
    try {
      const sessions = await container.repo.listSessionsForTrainee(req.params.id);
      res.json({ sessions });
    } catch (err) {
      res.status(500).json(apiError("INTERNAL", (err as Error).message));
    }
  });

  return r;
}
