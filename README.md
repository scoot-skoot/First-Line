# First Line

Crisis line volunteer **training simulator** for CodeRED Orion (University of Houston), Oct 10–11, 2026.

> **Training simulator only. Not a crisis service.** If you or someone you know is struggling, call or text **988** or chat at [988lifeline.org](https://988lifeline.org). In an emergency, call 911.

Design: [docs/DESIGN.md](docs/DESIGN.md) · Build spec: [docs/AGENT_BUILD.md](docs/AGENT_BUILD.md)

**Tracks:** MLH Best Use of Gemini API · MLH Best Use of ElevenLabs · Best Use of Backboard · (optional) Best Use of Tiger Data

## Setup (works with no API keys)

```bash
git clone https://github.com/scoot-skoot/codered-orion.git && cd codered-orion
npm install && npm run install:all
cp server/.env.example server/.env
cp web/.env.example web/.env
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001/api/health  

Defaults: `AI_PROVIDER=mock`, `VOICE_PROVIDER=mock`, `MEMORY_PROVIDER=none`, `REPO_PROVIDER=memory`. A full practice call (queue → conversation → debrief) works in the browser with zero keys.

## Demo script (mock mode)

1. Open the dispatch board — three scenario cards: **Maya** (Tier 1), **Ray** (Tier 2), **Dana** (Tier 3).
2. Click **Text practice** (or Take call) on Ray.
3. Exchange a few turns. Use validating language (“sounds like…”, open questions) and watch the distress meter move.
4. Click **End & debrief** for the scorecard (skills, warning signs, distress curve).

## Switch each service to real

| Env var | Mock / off | Real | Also set |
|---|---|---|---|
| `AI_PROVIDER` | `mock` (default) | `gemini` | `GEMINI_API_KEY` (optional: `GEMINI_MODEL`, `GEMINI_SCORER_MODEL`) |
| `VOICE_PROVIDER` | `mock` (default) | `elevenlabs` | `ELEVENLABS_API_KEY`, `ELEVENLABS_DEFAULT_VOICE_ID=EXAVITQu4vr4xnSDxMaL` |
| `MEMORY_PROVIDER` | `none` (default) | `backboard` | `BACKBOARD_API_KEY` |
| `REPO_PROVIDER` | `memory` (default) | `postgres` | `DATABASE_URL`, then `npm run db:reset` |

All keys are **server-side only** (`server/.env`). The web app only needs `VITE_API_URL`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Server (:3001) + web (:5173) |
| `npm run smoke` | Five API smoke tests (OK/FAIL; missing key → FAIL naming the var) |
| `npm run db:reset` | Apply `db/schema.sql` + `db/seed.sql` |
| `npm run build` | Server `tsc` + Vite `web/dist` (Render uses this) |
| `npm start` | Serve API + `web/dist` on `PORT` (default 3001) |
| `npm run typecheck` | Server `tsc` + web build |
| `npm run test` | Distress clamp unit tests |

## Deploy (Render)

Single web service — see **[docs/DEPLOY.md](docs/DEPLOY.md)**. Blueprint: [`render.yaml`](render.yaml) (`npm run build` → `npm start`, health `/api/health`).

## Layout

- `web/` — React + Vite + TS UI (talks only to our REST API)
- `server/src/routes` — thin HTTP · `services` orchestration · `ai` Gemini · `voice` ElevenLabs · `memory` Backboard · `db` Postgres
- `shared/types` — JSON contracts
- `db/` — schema and seed SQL
- `server/scripts/smoke/` — API smoke tests

## Safety

- Persistent 988 banner on every page
- “Training simulator only” labeling
- Non-graphic caller prompts and seed content
- Model failure → in-character safety fallback (no raw errors in the UI)

Never commit `.env` files or API keys.
