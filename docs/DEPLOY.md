# Deploy First Line (Render — single web service)

One Node service serves **both** the REST API (`/api/*`) and the Vite UI (`web/dist`), so the browser talks same-origin and `VITE_API_URL` can stay empty.

## Commands

| Step | Command |
|------|---------|
| Install + build | `npm run build` |
| Run | `npm start` |

- **Build** runs `install:all` (always installs **devDependencies** so `tsc` / Vite are available even when `NODE_ENV=production`), compiles the server with `tsc` (emits `shared/types` into `server/dist/`), and builds the web app into `web/dist`.
- **Start** runs `node dist/server/src/index.js` (compiled JS — **not** `tsx`). Binds to `process.env.PORT` (default `3001`).
- Health check: `GET /api/health`

Local production smoke:

```bash
NODE_ENV=production npm run build
NODE_ENV=production PORT=3010 npm start
# then: curl -s localhost:3010/api/health && open http://localhost:3010/
```

## Render Blueprint

[`render.yaml`](../render.yaml) defines a single `web` service:

- **buildCommand:** `npm run build`
- **startCommand:** `npm start`
- **healthCheckPath:** `/api/health`

Connect the repo in the [Render dashboard](https://dashboard.render.com/) → New → Blueprint → select this repo/branch.

## Environment variables

### Secrets (`sync: false` — set in the dashboard)

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Gemini caller + scorer |
| `ELEVENLABS_API_KEY` | STT + TTS |
| `BACKBOARD_API_KEY` | Caller memory |
| `DATABASE_URL` | Tiger Cloud / Postgres URL (prefer `?sslmode=require`; server strips sslmode and uses `rejectUnauthorized: false`) |

### Non-secret switches (Blueprint defaults)

| Variable | Default on Render |
|----------|-------------------|
| `AI_PROVIDER` | `gemini` |
| `VOICE_PROVIDER` | `elevenlabs` |
| `MEMORY_PROVIDER` | `backboard` |
| `REPO_PROVIDER` | `postgres` |
| `GEMINI_MODEL` | `gemini-3.8-flash` |
| `GEMINI_SCORER_MODEL` | `gemini-3.8-flash` |
| `ELEVENLABS_DEFAULT_VOICE_ID` | `EXAVITQu4vr4xnSDxMaL` |
| `NODE_VERSION` | `22` |
| `PORT` | set by Render |

Optional: `ELEVENLABS_TTS_MODEL`, `ELEVENLABS_STT_MODEL`, interruption threshold envs.

## Database

Against a fresh Tiger Cloud DB:

```bash
DATABASE_URL='postgres://…' npm run db:reset
```

If the DB already existed before migration `003`, apply:

`db/migrations/003_caller_relationships_defaults.sql`

## Web API base

- Production build uses `web/.env.production` → `VITE_API_URL=` (same-origin `/api/...`).
- Local Vite dev can use `web/.env` with `VITE_API_URL=http://localhost:3001` or rely on the Vite `/api` proxy.
