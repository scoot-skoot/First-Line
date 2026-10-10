# Full-duplex voice prototype (ElevenLabs Agents)

Timeboxed stretch: real barge-in / full-duplex conversation while keeping First Line’s Gemini-driven persona + distress meter.

**Default remains push-to-talk.** Set `CALL_MODE=duplex` to switch the voice path. PTT code under `web/src/pages/Call.tsx` and `server/src/services/callService.ts` is untouched.

## Approach (why this one)

Verified against current ElevenLabs docs ([Custom LLM](https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm), [Overrides](https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides), [Client tools](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools), [Auth / signed URL](https://elevenlabs.io/docs/eleven-agents/customization/authentication), [React SDK](https://elevenlabs.io/docs/eleven-agents/libraries/react)).

| Mode | Env | How persona + state work | Needs public URL? |
|---|---|---|---|
| **`overrides` (recommended for live demo)** | `DUPLEX_LLM_MODE=overrides` | ElevenLabs **built-in LLM** + per-session overrides for system prompt, first message, voice. Client tool `reportCallerState` updates distress/trust. Browser `onMessage` persists transcript turns. | **No** |
| `custom` (optional) | `DUPLEX_LLM_MODE=custom` | OpenAI-compatible `POST /api/duplex/v1/chat/completions` wraps our Gemini caller; streams spoken `caller_line` as SSE; persists turns server-side. Pass `{ sessionId }` via `customLlmExtraBody` → `elevenlabs_extra_body`. | **Yes** (ngrok / cloudflared) |

**Pick `overrides` for Sunday judging.** Tunnel flakes, changing ngrok URLs, and SSE formatting bugs are the fastest way to kill a live demo. Overrides still give persona-specific prompts/voices/first lines; configure the agent’s dashboard LLM to a Gemini model ElevenLabs hosts if you need the Gemini track on the voice path. Scoring/debrief still uses our Gemini scorer either way. Use `custom` when you have a stable public HTTPS URL and want Gemini as the sole caller brain.

## Create the ElevenLabs agent (dashboard)

1. Open [ElevenLabs Agents](https://elevenlabs.io/app/agents) → **Create agent**.
2. **Name:** e.g. `First Line Caller (duplex)`.
3. **System prompt:** temporary placeholder (overridden per session). e.g. `You are a crisis-line training caller. Speak briefly.`
4. **First message:** placeholder (overridden). e.g. `Hi…`
5. **Voice:** any default (overridden per persona `voiceId`).
6. **LLM:**
   - **overrides mode:** pick a fast hosted model (Gemini Flash / GPT mini class — whatever the dropdown offers). Enable **Security → Overrides** for:
     - System prompt (`prompt.prompt`)
     - First message
     - Voice ID (`tts.voice_id`)
   - **custom mode:** LLM = **Custom LLM**. Server URL = `https://<your-tunnel>/api/duplex` (ElevenLabs appends `/v1/chat/completions`). Model ID e.g. `firstline-gemini`. API key secret optional (we don’t require one). Limit tokens ~500–2000.
7. **Client tool** (overrides mode — required for distress meter):
   - Type: **Client**
   - Name: `reportCallerState` (exact)
   - Description: `Update the live distress/trust meter after each spoken reply.`
   - Parameters (object):
     - `distress` number required — 0–100
     - `trust` number required — 0–100
     - `emotion` string required — calm|anxious|tearful|irritated|angry|flat|relieved
     - `revealed_warning_signs` array of strings optional
     - `should_end_call` boolean optional
   - Wait for response: optional (can be off)
8. **Authentication:** enable **signed URL / auth** (private agent). Do **not** combine with allowlist.
9. **Turn-taking / interruptions:** leave barge-in / interruption enabled (Agents default). Soften eagerness if the caller talks over the trainee too much.
10. Copy **Agent ID** (`agent_…`) → `ELEVENLABS_AGENT_ID`.

## Env vars (`server/.env`)

```bash
CALL_MODE=duplex
ELEVENLABS_API_KEY=...          # already used for PTT STT/TTS
ELEVENLABS_AGENT_ID=agent_...
DUPLEX_LLM_MODE=overrides       # or custom
DUPLEX_CONNECTION=webrtc        # or websocket (signed URL)
AI_PROVIDER=gemini
GEMINI_API_KEY=...              # opening line + debrief (+ custom LLM)
VOICE_PROVIDER=elevenlabs       # not used for duplex audio path, but keep for PTT fallback
```

Web: unchanged `VITE_API_URL=http://localhost:3001`.

## Run (overrides / demo path)

```bash
# terminal 1
cd server && CALL_MODE=duplex DUPLEX_LLM_MODE=overrides \
  ELEVENLABS_AGENT_ID=agent_xxx npm run dev

# terminal 2
cd web && npm run dev
```

1. Dispatch board shows `call=duplex`.
2. **Take call (voice)** → creates duplex session, stashes signed token + overrides in `sessionStorage`.
3. On the call page: **Connect mic (full-duplex)** → browser WebRTC/WebSocket to ElevenLabs.
4. Speak freely; interrupt the caller. Watch transcript + distress meter.
5. **End & debrief** → existing Gemini scorer.

## Custom LLM path (optional)

```bash
# Expose local API publicly (pick one)
ngrok http 3001
# or: cloudflared tunnel --url http://localhost:3001
```

Point the agent Custom LLM server URL at `https://<tunnel-host>/api/duplex` (not `/api/duplex/v1/...` — ElevenLabs adds `/v1/chat/completions`).

```bash
CALL_MODE=duplex
DUPLEX_LLM_MODE=custom
ELEVENLABS_AGENT_ID=agent_xxx
AI_PROVIDER=gemini
GEMINI_API_KEY=...
```

Client still starts with `customLlmExtraBody: { sessionId }` so the endpoint can persist turns.

## Code layout

- `server/src/duplex/` — status, session bootstrap, turn/state, custom LLM SSE
- `web/src/features/duplex/` — API client, `DuplexCall`, `CallRoute` switch
- Minimal wiring: `config.ts`, `container.ts`, `index.ts`, `App.tsx`, `Home.tsx`, health providers

## Latency expectations (rough)

| Path | Trainee stops talking → first caller audio |
|---|---|
| PTT (baseline) | ~2–5 s (STT + Gemini + TTS) |
| Duplex overrides | ~0.8–2.5 s typical for Agents + hosted LLM (measure on demo wifi) |
| Duplex custom + Gemini | ~1.5–4 s (Gemini JSON + SSE + TTS); buffer `"... "` softens the wait |

## Live-demo risks

- Agent Security overrides not enabled → session start fails or ignores persona.
- Client tool name mismatch → distress meter stuck; conversation still works.
- Signed URL / token expires (~15 min) if you leave the call page idle before Connect.
- Custom LLM without tunnel or with stale ngrok URL → agent silent / errors.
- Mic permission blocked / VPN / corporate firewall breaking WebRTC (try `DUPLEX_CONNECTION=websocket`).
- Built-in LLM may drift from our JSON distress rules; client tool + server clamp (±20) mitigate.
- We cannot fully E2E-test here without your ElevenLabs/Gemini keys — verify on the demo laptop before judging.
