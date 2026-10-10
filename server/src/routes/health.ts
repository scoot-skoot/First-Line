import { Router } from "express";
import type { AppContainer } from "../container.js";

export function healthRouter(container: AppContainer): Router {
  const r = Router();
  r.get("/health", (_req, res) => {
    res.json({ ok: true, providers: container.providers });
  });
  return r;
}
