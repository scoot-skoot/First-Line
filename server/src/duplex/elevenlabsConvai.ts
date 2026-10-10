import { config } from "../config.js";

/**
 * ElevenLabs Conversational AI / Agents auth helpers.
 * Docs:
 * - Signed URL (WebSocket): GET /v1/convai/conversation/get-signed-url
 * - Conversation token (WebRTC): GET /v1/convai/conversation/token
 * - Auth guide: https://elevenlabs.io/docs/eleven-agents/customization/authentication
 * - React SDK: https://elevenlabs.io/docs/eleven-agents/libraries/react
 */

export async function fetchSignedUrl(agentId: string): Promise<string> {
  const apiKey = config.elevenLabsApiKey;
  if (!apiKey) throw missingKey();
  const url = new URL(
    "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
  );
  url.searchParams.set("agent_id", agentId);
  const res = await fetch(url, {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(
      new Error(`ElevenLabs signed URL failed (${res.status}): ${body.slice(0, 200)}`),
      { status: 502, code: "ELEVENLABS_SIGNED_URL" },
    );
  }
  const json = (await res.json()) as { signed_url?: string };
  if (!json.signed_url) {
    throw Object.assign(new Error("ElevenLabs signed URL missing signed_url"), {
      status: 502,
      code: "ELEVENLABS_SIGNED_URL",
    });
  }
  return json.signed_url;
}

export async function fetchConversationToken(agentId: string): Promise<{
  token: string;
  conversationId?: string;
}> {
  const apiKey = config.elevenLabsApiKey;
  if (!apiKey) throw missingKey();
  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/token");
  url.searchParams.set("agent_id", agentId);
  const res = await fetch(url, {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(
      new Error(
        `ElevenLabs conversation token failed (${res.status}): ${body.slice(0, 200)}`,
      ),
      { status: 502, code: "ELEVENLABS_CONV_TOKEN" },
    );
  }
  const json = (await res.json()) as { token?: string; conversation_id?: string };
  if (!json.token) {
    throw Object.assign(new Error("ElevenLabs conversation token missing token"), {
      status: 502,
      code: "ELEVENLABS_CONV_TOKEN",
    });
  }
  return { token: json.token, conversationId: json.conversation_id };
}

function missingKey(): Error {
  return Object.assign(new Error("ELEVENLABS_API_KEY required for duplex"), {
    status: 503,
    code: "MISSING_ELEVENLABS_KEY",
  });
}
