import { Router } from "express";
import { z } from "zod";
import type { AppContainer } from "../container.js";
import { config } from "../config.js";
import { apiError, emotionSchema } from "../validation.js";
import { handleCustomChatCompletions } from "./customLlm.js";

function statusOf(err: unknown): number {
  return typeof (err as { status?: number }).status === "number"
    ? (err as { status: number }).status
    : 500;
}

function codeOf(err: unknown): string {
  return (err as { code?: string }).code ?? "INTERNAL";
}

const startBodySchema = z.object({
  traineeId: z.string().uuid(),
  scenarioId: z.string().uuid(),
});

const transcriptBodySchema = z.object({
  speaker: z.enum(["trainee", "caller"]),
  text: z.string().min(1).max(8000),
  source: z.string().max(64).optional(),
});

const stateBodySchema = z.object({
  distress: z.number().min(0).max(100),
  trust: z.number().min(0).max(100),
  emotion: emotionSchema,
  revealed_warning_signs: z.array(z.string()).optional(),
  should_end_call: z.boolean().optional(),
  caller_line: z.string().max(4000).optional(),
});

export function duplexRouter(container: AppContainer): Router {
  const r = Router();
  const duplex = container.duplex;

  r.get("/duplex/status", (_req, res) => {
    res.json({
      callMode: config.callMode,
      duplexEnabled: config.callMode === "duplex",
      llmMode: config.duplexLlmMode,
      connectionType: config.duplexConnection,
      agentConfigured: Boolean(config.elevenLabsAgentId && config.elevenLabsApiKey),
      agentIdPresent: Boolean(config.elevenLabsAgentId),
      customLlmPath: "/api/duplex/v1/chat/completions",
    });
  });

  r.post("/duplex/sessions", async (req, res) => {
    try {
      const body = startBodySchema.parse(req.body);
      const result = await duplex.startSession(body);
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

  r.post("/duplex/sessions/:id/turns", async (req, res) => {
    try {
      const body = transcriptBodySchema.parse(req.body);
      const turn = await duplex.appendTranscriptTurn({
        sessionId: req.params.id,
        speaker: body.speaker,
        text: body.text,
        source: body.source,
      });
      res.status(201).json({ turn });
    } catch (err) {
      if ((err as { name?: string }).name === "ZodError") {
        res.status(400).json(apiError("VALIDATION_ERROR", "Invalid body", { err }));
        return;
      }
      const status = statusOf(err);
      res.status(status).json(apiError(codeOf(err), (err as Error).message));
    }
  });

  r.post("/duplex/sessions/:id/state", async (req, res) => {
    try {
      const body = stateBodySchema.parse(req.body);
      const result = await duplex.reportCallerState({
        sessionId: req.params.id,
        ...body,
      });
      res.json(result);
    } catch (err) {
      if ((err as { name?: string }).name === "ZodError") {
        res.status(400).json(apiError("VALIDATION_ERROR", "Invalid body", { err }));
        return;
      }
      const status = statusOf(err);
      res.status(status).json(apiError(codeOf(err), (err as Error).message));
    }
  });

  r.post("/duplex/sessions/:id/end", async (req, res) => {
    try {
      const debrief = await duplex.endSession(req.params.id);
      res.json({ debrief });
    } catch (err) {
      const status = statusOf(err);
      res.status(status).json(apiError(codeOf(err), (err as Error).message));
    }
  });

  // Custom LLM: ElevenLabs expects .../v1/chat/completions under the server URL.
  // Point the agent Custom LLM server URL at https://<tunnel>/api/duplex
  r.post("/duplex/v1/chat/completions", handleCustomChatCompletions(duplex));

  return r;
}
