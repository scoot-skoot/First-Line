import { Router } from "express";
import type { AppContainer } from "../container.js";
import { BuildCallerService } from "../services/buildCallerService.js";
import { apiError, buildCallerBodySchema } from "../validation.js";

export function buildCallerRouter(container: AppContainer): Router {
  const r = Router();
  const service = new BuildCallerService(container.repo);

  r.post("/scenarios/build", async (req, res) => {
    try {
      const body = buildCallerBodySchema.parse(req.body);
      const result = await service.build(body.description);
      res.status(201).json(result);
    } catch (err) {
      if ((err as { name?: string }).name === "ZodError") {
        res.status(400).json(apiError("VALIDATION_ERROR", "Invalid body", { err }));
        return;
      }
      const status =
        typeof (err as { status?: number }).status === "number"
          ? (err as { status: number }).status
          : 500;
      res.status(status).json(apiError("BUILD_CALLER_FAILED", (err as Error).message));
    }
  });

  r.get("/voices", (_req, res) => {
    res.json({
      voices: [
        {
          id: "EXAVITQu4vr4xnSDxMaL",
          name: "Sarah",
          style: "young adult, soft, warm",
        },
        {
          id: "TX3LPaxmHKxFdv7VOQHJ",
          name: "Liam",
          style: "middle-aged, low, tired or angry",
        },
        {
          id: "21m00Tcm4TlvDq8ikWAM",
          name: "Rachel",
          style: "adult, clear, firm",
        },
        {
          id: "pNInz6obpgDQGcFmaJgB",
          name: "Adam",
          style: "adult male, steady",
        },
        {
          id: "XrExE9yKIg1WjnnlVkGX",
          name: "Matilda",
          style: "adult, thoughtful",
        },
      ],
    });
  });

  return r;
}
