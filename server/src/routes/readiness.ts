import { Router } from "express";
import type { AppContainer } from "../container.js";
import { ReadinessService } from "../services/readinessService.js";
import { apiError } from "../validation.js";

export function readinessRouter(container: AppContainer): Router {
  const r = Router();
  const service = new ReadinessService(container.repo);

  r.get("/trainees/:id/readiness", async (req, res) => {
    try {
      const report = await service.report(req.params.id);
      res.json({ report });
    } catch (err) {
      const status =
        typeof (err as { status?: number }).status === "number"
          ? (err as { status: number }).status
          : 500;
      res
        .status(status)
        .json(apiError("READINESS_FAILED", (err as Error).message));
    }
  });

  return r;
}
