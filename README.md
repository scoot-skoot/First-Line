# CodeRed Orion 2026

Team repo for CodeRED Orion (University of Houston), Oct 10–11, 2026.

**Current idea:** SteadyLine, a crisis line volunteer training simulator (working name; may change).
Full design doc: [docs/DESIGN.md](docs/DESIGN.md) (PDF: [docs/DESIGN.pdf](docs/DESIGN.pdf)).

> Training simulator only. Not a crisis service. If you or someone you know is struggling, call or text **988** or chat at [988lifeline.org](https://988lifeline.org). In an emergency, call 911.

## Tracks
MLH Best Use of Gemini API · MLH Best Use of ElevenLabs · Best Use of Backboard · (optional) Best Use of Tiger Data

## Workflow
- Branch per feature (`feat/<name>`), open a PR into `main`, get a quick review from one teammate.
- Never commit API keys. Put them in `.env` (gitignored) and keep `.env.example` updated.

## Setup
```bash
git clone https://github.com/scoot-skoot/codered-orion.git && cd codered-orion
npm install && npm run install:all
cp server/.env.example server/.env   # fill in your API keys
cp web/.env.example web/.env
npm run dev                          # server :3001, web :5173
```
Check http://localhost:3001/api/health to see which keys are loaded.

## Layout
- `web/` React + Vite + TS UI (talks only to our REST API)
- `server/src/routes` HTTP layer · `services` call orchestration · `ai` Gemini · `voice` ElevenLabs · `memory` Backboard · `db` Postgres
- `shared/types` JSON contracts used by both sides
- `db/` schema and seed SQL · `scripts/` API smoke tests
