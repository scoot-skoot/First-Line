import { Router } from "express";
import multer from "multer";
import type { AppContainer } from "../container.js";
import {
  apiError,
  createSessionBodySchema,
  interruptionBodySchema,
  textTurnBodySchema,
} from "../validation.js";
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
        interruptionThresholds: container.calls.getInterruptionThresholds(),
      });
    } catch (err) {
      res.status(500).json(apiError("INTERNAL", (err as Error).message));
    }
  });

  r.post("/sessions/:id/turns", upload.single("audio"), async (req, res) => {
    try {
      let text: string | undefined;
      let bargeIn: boolean | undefined;
      let bargeInFromSeq: number | undefined;
      if (req.is("multipart/form-data") || req.file) {
        text = typeof req.body?.text === "string" ? req.body.text : undefined;
        bargeIn =
          req.body?.bargeIn === "true" ||
          req.body?.bargeIn === true ||
          req.body?.bargeIn === "1";
        const seqRaw = req.body?.bargeInFromSeq;
        if (seqRaw != null && seqRaw !== "") bargeInFromSeq = Number(seqRaw);
      } else {
        const parsed = textTurnBodySchema.safeParse(req.body);
        if (parsed.success) {
          text = parsed.data.text;
          bargeIn = parsed.data.bargeIn;
          bargeInFromSeq = parsed.data.bargeInFromSeq;
        }
      }

      const result = await container.calls.takeTurn({
        sessionId: req.params.id,
        text,
        audio: req.file?.buffer,
        mimeType: req.file?.mimetype,
        bargeIn,
        bargeInFromSeq,
      });
      res.status(201).json(result);
    } catch (err) {
      const status = statusOf(err);
      res.status(status).json(apiError(codeOf(err), (err as Error).message));
    }
  });

  r.post("/sessions/:id/interruptions", upload.single("audio"), async (req, res) => {
    try {
      let kind: "ptt_timeout" | "silence" | "barge_in";
      let partialText: string | undefined;
      let bargeInFromSeq: number | undefined;

      if (req.is("multipart/form-data") || req.file) {
        const parsed = interruptionBodySchema.safeParse({
          kind: req.body?.kind,
          partialText: req.body?.partialText,
          bargeInFromSeq:
            req.body?.bargeInFromSeq != null && req.body?.bargeInFromSeq !== ""
              ? Number(req.body.bargeInFromSeq)
              : undefined,
        });
        if (!parsed.success) {
          res.status(400).json(apiError("VALIDATION_ERROR", "Invalid interruption body"));
          return;
        }
        kind = parsed.data.kind;
        partialText = parsed.data.partialText;
        bargeInFromSeq = parsed.data.bargeInFromSeq;
      } else {
        const parsed = interruptionBodySchema.parse(req.body);
        kind = parsed.kind;
        partialText = parsed.partialText;
        bargeInFromSeq = parsed.bargeInFromSeq;
      }

      const result = await container.calls.interrupt({
        sessionId: req.params.id,
        kind,
        partialText,
        audio: req.file?.buffer,
        mimeType: req.file?.mimetype,
        bargeInFromSeq,
      });
      res.status(201).json(result);
    } catch (err) {
      if ((err as { name?: string }).name === "ZodError") {
        res.status(400).json(apiError("VALIDATION_ERROR", "Invalid body", { err }));
        return;
      }
      const status = statusOf(err);
      res.status(status).json(apiError(codeOf(err), (err as Error).message));
    }
  });

  r.get("/interruptions/thresholds", (_req, res) => {
    res.json({ thresholds: container.calls.getInterruptionThresholds() });
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
