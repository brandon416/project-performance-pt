# Project Performance PT

**Clinical Command Center** — AI-powered exercise analysis and TrueCoach automation for Dr. Brandon Pascual.

Replicated from [AI-Studio-Exercise](https://github.com/brandon416/AI-Studio-Exercise) using OpenRouter multi-model AI instead of Google Gemini direct.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite, Tailwind CSS v4, Lucide Icons |
| Backend | Express + tsx (TypeScript) |
| AI | OpenRouter (Gemini 3.1 Pro, Claude 4.6 Sonnet, Kimi 2.6) |
| Auth | Firebase Auth + Google OAuth |
| DB | Firestore (user profiles, OAuth tokens) |
| APIs | Google Sheets, Calendar, Drive, TrueCoach, Acuity |

## Modules

1. **Sheet Inbox** — Read/edit Master Exercise Library V2
2. **AI Chat** — Streaming multi-model clinical assistant
3. **Exercise Creator** — Upload video → AI analysis → cues → Sheet + TrueCoach
4. **TrueCoach Dashboard** — Library upload, +7 day copier, client insights
5. **Automation** — Filename → Calendar → Client matching engine

## Quick Start

```bash
# 1. Clone
git clone https://github.com/brandon416/project-performance-pt.git
cd project-performance-pt

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Fill in your API keys

# 4. Run
npm run dev
# → http://localhost:3000
```

## Environment Variables

See `.env.example` for all required/optional vars:
- `OPENROUTER_API_KEY` — Get from [openrouter.ai](https://openrouter.ai)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Cloud Console
- `TRUECOACH_*` — TrueCoach credentials (optional)
- `ACUITY_*` — Acuity Scheduling credentials (optional)
- Firebase config — Set as `VITE_FIREBASE_*` vars

## Architecture

```
User → React Frontend (Vite :5173)
         ↓ proxy /api/*
Express Backend (:3001)
  ├── /api/ai/chat (SSE streaming → OpenRouter)
  ├── /api/sheets/* (Google Sheets CRUD)
  ├── /api/automation/* (video analysis + calendar matching)
  ├── /api/truecoach/* (TrueCoach proxy + convenience)
  └── /api/acuity/* (appointment lookup)
```

## Build Plan

See [docs/phased-build-plan.md](./docs/phased-build-plan.md) for the full SPARC methodology breakdown.

## Reference

- [Architecture Review](./docs/repo-review.md) — Full analysis of the original repo
- [Ruflo Skills](https://github.com/brandon416/ruflo) — Agent skills used for planning

## License

Private — Dr. Brandon Pascual / Project Performance PT
