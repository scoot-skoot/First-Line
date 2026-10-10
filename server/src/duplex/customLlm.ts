import type { Request, Response } from "express";
import type { DuplexService } from "./duplexService.js";

/**
 * OpenAI-compatible Chat Completions SSE endpoint for ElevenLabs Custom LLM.
 * Docs: https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm
 *
 * ElevenLabs POSTs to /v1/chat/completions with messages + optional
 * elevenlabs_extra_body (we put { sessionId } via customLlmExtraBody / extra_body).
 * We stream back the spoken caller_line as content deltas.
 *
 * Requires a public HTTPS URL (ngrok / cloudflared) pointed at this server.
 * Prefer DUPLEX_LLM_MODE=overrides for live demos — no tunnel needed.
 */

interface ChatMessage {
  role: string;
  content?: string | null | Array<{ type?: string; text?: string }>;
}

function messageText(m: ChatMessage): string {
  if (typeof m.content === "string") return m.content;
  if (Array.isArray(m.content)) {
    return m.content
      .map((p) => (typeof p.text === "string" ? p.text : ""))
      .join("");
  }
  return "";
}

function extractSessionId(body: Record<string, unknown>): string | null {
  const extra =
    (body.elevenlabs_extra_body as Record<string, unknown> | undefined) ??
    (body.extra_body as Record<string, unknown> | undefined);
  if (extra && typeof extra.sessionId === "string") return extra.sessionId;
  if (typeof body.user === "string" && body.user.length > 8) return body.user;
  if (typeof body.user_id === "string" && body.user_id.length > 8) return body.user_id;
  return null;
}

function lastUserText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return messageText(messages[i]!).trim();
  }
  return "";
}

function sseChunk(opts: {
  id: string;
  model: string;
  content?: string;
  finish?: string | null;
}): string {
  const payload = {
    id: opts.id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: opts.model,
    choices: [
      {
        index: 0,
        delta: opts.content != null ? { content: opts.content } : {},
        finish_reason: opts.finish ?? null,
      },
    ],
  };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function handleCustomChatCompletions(duplex: DuplexService) {
  return async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const model = typeof body.model === "string" ? body.model : "firstline-gemini";
    const messages = Array.isArray(body.messages)
      ? (body.messages as ChatMessage[])
      : [];
    const sessionId = extractSessionId(body);
    const id = `chatcmpl-duplex-${Date.now()}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    try {
      if (!sessionId) {
        // Still return something speakable so the agent doesn't hang.
        const fallback =
          "Sorry… I'm having trouble collecting my thoughts right now.";
        res.write(sseChunk({ id, model, content: fallback }));
        res.write(sseChunk({ id, model, finish: "stop" }));
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      const traineeText = lastUserText(messages);
      // Buffer words while Gemini thinks (custom LLM docs recommend "... " for latency).
      res.write(
        sseChunk({ id, model, content: "... " }),
      );

      const { callerLine } = await duplex.generateCallerLineForCustomLlm({
        sessionId,
        traineeText,
      });

      // Stream in small chunks so TTS can start early.
      const words = callerLine.split(/(\s+)/);
      let buf = "";
      for (const w of words) {
        buf += w;
        if (buf.length >= 24) {
          res.write(sseChunk({ id, model, content: buf }));
          buf = "";
        }
      }
      if (buf) res.write(sseChunk({ id, model, content: buf }));

      res.write(sseChunk({ id, model, finish: "stop" }));
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("[duplex/custom-llm]", (err as Error).message);
      const fallback =
        "I… I need a second. Can you say that again?";
      try {
        res.write(sseChunk({ id, model, content: fallback }));
        res.write(sseChunk({ id, model, finish: "stop" }));
        res.write("data: [DONE]\n\n");
        res.end();
      } catch {
        res.end();
      }
    }
  };
}
