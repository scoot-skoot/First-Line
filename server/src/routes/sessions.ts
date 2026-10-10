import { Router } from "express";
import multer from "multer";
import type { AppContainer } from "../container.js";
import { apiError, createSessionBodySchema, textTurnBodySchema } from "../validation.js";
import { callerTurnView, traineeTurnView } from "../services/views.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function statusOf(err: unknown): number {
  return typeof (err as { status?: number }).status === "number"
    ? (err as { status: number }).status
    : 500;
}

function codeOf(err: unknown): string {
  return (err as { code?: string }).code ?? "INTERNAL";
}

export function sessionsRouter(container: AppContainer): Router {
  const r = Router();

  r.post("/sessions", async (req, res) => {
    try {
      const body = createSessionBodySchema.parse(req.body);
      const result = await container.calls.startSession(body);
      res.status(201).json(result);
    } catch (err) {
      const status = statusOf(err);
      if ((err as { name?: string }).name === "ZodError") {
        res.status(400).json(apiError("VALIDATION_ERROR", "Invalid body", { err }));
        return;
      }
      res.status(status).json(apiError(codeOf(err), (err as Error).message));
    }
  });

  r.get("/sessions/:id", async (req, res) => {
    try {
      const detail = await container.repo.getSession(req.params.id);
      if (!detail) {
        res.status(404).json(apiError("NOT_FOUND", "Session not found"));
        return;
      }
      const callerRemembers =
        container.calls.getCallerRemembers(req.params.id) ??
        (() => {
          const opening = detail.turns.find((t) => t.speaker === "caller");
          const fromState = opening?.state?.callerRemembers as
            | { facts?: string[]; source?: string }
            | undefined;
          if (fromState?.facts?.length) {
            return {
              facts: fromState.facts,
              source: (fromState.source as
                | "backboard"
                | "session_history"
                | "seed"
                | "none") ?? "session_history",
            };
          }
          return { facts: [] as string[], source: "none" as const };
        })();
      res.json({
        session: detail.session,
        turns: detail.turns.map((t) =>
          t.speaker === "caller" ? callerTurnView(t) : traineeTurnView(t),
        ),
        debrief: detail.debrief,
        callerRemembers,
      });
    } catch (err) {
      res.status(500).json(apiError("INTERNAL", (err as Error).message));
    }
  });

  r.post("/sessions/:id/turns", upload.single("audio"), async (req, res) => {
    try {
      let text: string | undefined;
      if (req.is("multipart/form-data") || req.file) {
        text = typeof req.body?.text === "string" ? req.body.text : undefined;
      } else {
        const parsed = textTurnBodySchema.safeParse(req.body);
        if (parsed.success) text = parsed.data.text;
      }

      const result = await container.calls.takeTurn({
        sessionId: req.params.id,
        text,
        audio: req.file?.buffer,
        mimeType: req.file?.mimetype,
      });
      res.status(201).json(result);
    } catch (err) {
      const status = statusOf(err);
      res.status(status).json(apiError(codeOf(err), (err as Error).message));
    }
  });

  r.get("/sessions/:id/turns/:seq/audio", async (req, res) => {
    try {
      const seq = Number(req.params.seq);
      const { stream, contentType } = await container.calls.getAudioStream(
        req.params.id,
        seq,
      );
      res.setHeader("Content-Type", contentType);
      stream.pipe(res);
    } catch (err) {
      const status = statusOf(err);
      res.status(status).json(apiError(codeOf(err), (err as Error).message));
    }
  });

  r.post("/sessions/:id/end", async (req, res) => {
    try {
      const debrief = await container.calls.endSession(req.params.id);
      res.json({ debrief });
    } catch (err) {
      const status = statusOf(err);
      res.status(status).json(apiError(codeOf(err), (err as Error).message));
    }
  });

  return r;
}
