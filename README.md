# First Line

**Hold the line.**

Winner, MLH Best Use of ElevenLabs — CodeRed Orion 2026 (UH)

[![Live demo](https://img.shields.io/badge/Live_demo-first--line--cvjm.onrender.com-0d4a56?style=flat-square)](https://first-line-cvjm.onrender.com)
[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react&logoColor=white)](./web)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](./shared)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat-square&logo=nodedotjs&logoColor=white)](./server)
[![Gemini](https://img.shields.io/badge/Google-Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-Voice_+_STT-000000?style=flat-square)](https://elevenlabs.io/)
[![PostgreSQL](https://img.shields.io/badge/Tiger_Data-Postgres-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.tigerdata.com/)
[![Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=flat-square&logo=render&logoColor=white)](https://first-line-cvjm.onrender.com)

**Live demo:** [https://first-line-cvjm.onrender.com](https://first-line-cvjm.onrender.com)

Crisis line volunteers often learn by shadowing and scarce roleplay. **First Line** gives them on-demand practice with realistic AI voice callers who react in the moment, remember past sessions, and surface a scored debrief — so trainees can build skill before they ever pick up a real line.

> **Training tool only — not a crisis service.** If you are in crisis, call or text **988** in the US (or visit [988lifeline.org](https://988lifeline.org)). In an emergency, call 911.

## Features

- **Callers who remember you** — per trainee–caller memory via [Backboard](https://www.backboard.ai/), so callbacks feel continuous
- **ElevenLabs expressive voices + STT** — spoken practice with push-to-talk transcription
- **Live distress / trust meter** — watch how each response moves the caller (0–100)
- **Gemini caller + scored debrief** — persona-driven turns and skill-focused feedback after the call
- **Readiness report** — practice history persisted in Tiger Data Postgres
- **Build-a-Caller** — create custom practice personas for targeted drills

## Architecture

```mermaid
flowchart LR
  subgraph Client
    UI["React + Vite web"]
  end
  subgraph Render["Render — single Node service"]
    API["Express API"]
  end
  subgraph Providers
    Gemini["Gemini<br/>caller + scorer"]
    Eleven["ElevenLabs<br/>TTS + STT"]
    Backboard["Backboard<br/>memory"]
    Tiger["Tiger Data<br/>Postgres"]
  end
  UI -->|"REST /api"| API
  API --> Gemini
  API --> Eleven
  API --> Backboard
  API --> Tiger
```

| Layer | Role |
|---|---|
| `web/` | React + Vite + TypeScript UI |
| `server/` | Express routes, orchestration, provider adapters |
| `shared/types` | Shared JSON contracts |
| `db/` | Schema, seed, migrations |

## Tech stack

| Area | Choice |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind |
| Backend | Node.js 22, Express, TypeScript |
| AI caller / scoring | Google Gemini |
| Voice | ElevenLabs TTS + STT |
| Memory | Backboard |
| Data | Tiger Data (Postgres / Timescale-compatible) |
| Hosting | Render (API + static UI, one service) |

## Key engineering decisions

- **Swappable provider interfaces + mocks** — `AI_PROVIDER`, `VOICE_PROVIDER`, `MEMORY_PROVIDER`, and `REPO_PROVIDER` swap between mock and live backends so the full call flow works with zero API keys
- **Safe fallback on AI failure** — model errors become in-character safety responses; no raw stack traces in the trainee UI
- **Per trainee–caller memory scoping** — Backboard memory is scoped so one volunteer's history with Maya does not leak into another trainee's session
- **Push-to-talk over full duplex** — reliable PTT for hackathon demos; full-duplex interruption prototypes live on separate branches

## Local setup

Works with **no API keys** (mock defaults).

```bash
git clone https://github.com/scoot-skoot/codered-orion.git && cd codered-orion
npm install && npm run install:all
cp server/.env.example server/.env
cp web/.env.example web/.env
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001/api/health  

Defaults: `AI_PROVIDER=mock`, `VOICE_PROVIDER=mock`, `MEMORY_PROVIDER=none`, `REPO_PROVIDER=memory`.

| Command | What it does |
|---|---|
| `npm run dev` | Server (:3001) + web (:5173) |
| `npm run smoke` | API smoke tests |
| `npm run db:reset` | Apply `db/schema.sql` + `db/seed.sql` |
| `npm run build` | Server `tsc` + Vite `web/dist` |
| `npm start` | Serve API + `web/dist` on `PORT` |
| `npm run typecheck` | Server `tsc` + web build |
| `npm run test` | Unit tests |

Flip providers to real by setting keys in `server/.env` (see `server/.env.example`). Deploy notes: [docs/DEPLOY.md](docs/DEPLOY.md).

## Team

- **[Teammate]**
- **David Ajao** ([@scoot-skoot](https://github.com/scoot-skoot))

Built at **CodeRed Orion 2026** (University of Houston).

## Responsible use

First Line is a **training simulator for volunteers**, not a substitute for professional crisis services, clinical supervision, or emergency response. Content is intentionally non-graphic. Persistent UI labeling and a 988 banner reinforce that boundary.

If you or someone you know is in crisis, **call or text 988** in the US.

## Docs

- [Design notes](docs/DESIGN.md)
- [Build spec](docs/AGENT_BUILD.md)
- [Deploy (Render)](docs/DEPLOY.md)
