# Project Performance PT — Phased Build Plan
## Using SPARC Methodology (from Ruflo)

---

## Phase 0: Foundation (SPECIFICATION)
**Goal State**: Dev environment boots, env validates, health endpoint responds.
**Duration**: ~30 min

### Deliverables:
- [x] `package.json` with all deps
- [x] `src/lib/env.ts` — Zod-validated environment config
- [x] `.env.example` with all required vars
- [ ] `tsconfig.json` + `vite.config.ts` (dev proxy + Tailwind v4)
- [ ] `index.html` + `src/main.tsx` + `src/App.tsx` (shell)
- [ ] `server.ts` health check running

### Success Criteria:
```bash
npm run dev  # Boots Vite + Express on :3000
curl localhost:3000/health  # {"status":"ok"}
```

---

## Phase 1: Auth & Data Layer (ARCHITECTURE)
**Goal State**: User can sign in with Firebase, connect Google OAuth, and tokens persist.
**Duration**: ~1 hr

### Deliverables:
- [ ] `src/lib/firebase.ts` — Firebase client init
- [ ] `src/components/Auth.tsx` — Firebase sign-in + Google OAuth popup
- [ ] `src/hooks/useAuth.ts` — auth state context
- [ ] Server: `/api/auth/url` + `/auth/callback` (already scaffolded)
- [ ] Firestore writes: user profile + OAuth tokens

### Success Criteria:
- Sign in with Google → lands on dashboard
- OAuth popup → tokens stored in Firestore
- Page refresh → stays authenticated

---

## Phase 2: Sheet Inbox (IMPLEMENTATION — TDD)
**Goal State**: Read Master Exercise Library, display rows, edit inline, bulk skip.
**Duration**: ~1.5 hr

### Deliverables:
- [ ] `src/components/SheetInbox.tsx` — table with expandable rows
- [ ] Server: `/api/sheets/inbox`, `/api/sheets/update-row`, `/api/sheets/update-multiple-rows` (done)
- [ ] Row status indicators (Ready, Skipped, AUTO-FILLED)
- [ ] Inline edit + save with toast feedback
- [ ] Bulk "Skip Selected" action

### Success Criteria:
- Loads sheet data within 2s
- Edit a cell → saved to Google Sheet
- Skip 3 rows → all marked "Skipped" in sheet

---

## Phase 3: AI Core (IMPLEMENTATION)
**Goal State**: OpenRouter streaming chat + exercise cue generation working end-to-end.
**Duration**: ~1.5 hr

### Deliverables:
- [x] `src/lib/openrouter.ts` — server-side AI service (done)
- [ ] `src/hooks/useStreamingChat.ts` — SSE consumer hook
- [ ] `src/components/AIChat.tsx` — chat UI with model selector
- [ ] `src/components/AITools.tsx` — exercise cue generator (lite mode)
- [ ] Server: `/api/ai/chat` (SSE streaming), `/api/ai/cues` (done)
- [ ] Model picker: Gemini 3.1 Pro, Claude 4.6 Sonnet, Kimi 2.6

### Success Criteria:
- Chat streams tokens in real-time
- "Generate cues for: Pallof Press" → structured JSON response
- Model switcher works without page reload

---

## Phase 4: AI Exercise Creator (IMPLEMENTATION)
**Goal State**: Upload video → AI analysis → structured output → Sheet + TrueCoach sync.
**Duration**: ~2 hr

### Deliverables:
- [ ] `src/components/AIExerciseCreator.tsx` — file upload + results display
- [ ] Server: `/api/automation/analyze-media` (done) + ffmpeg frame extraction
- [ ] Vision model analysis (base64 image/video frames → OpenRouter)
- [ ] Auto-write to Google Sheet
- [ ] Auto-sync to TrueCoach library

### Success Criteria:
- Upload 15MB video → analysis in <30s
- Exercise name, cues, sets/reps extracted correctly
- Row appears in Google Sheet
- Exercise appears in TrueCoach library

---

## Phase 5: TrueCoach Dashboard (IMPLEMENTATION)
**Goal State**: Full TrueCoach management panel — library upload, +7 day copy, client insights.
**Duration**: ~2 hr

### Deliverables:
- [ ] `src/components/TrueCoachDashboard.tsx` — main panel with 3 sections
- [ ] Section 1: Direct Library Uploader (name, URL, description → TC)
- [ ] Section 2: +7 Day Auto-Copier (clone last week's workouts forward)
- [ ] Section 3: Client Insights (sessions remaining, Acuity appointments, today's workout)
- [x] Server: TrueCoach proxy + convenience endpoints (done)
- [x] Server: Acuity appointments (done)

### Success Criteria:
- Push exercise → appears in TrueCoach library
- +7 Day Copy → new hidden workouts created
- Select client → shows sessions, appointments, workouts

---

## Phase 6: Automation Engine (REFINEMENT)
**Goal State**: One-click automation matches video filenames to calendar events and syncs.
**Duration**: ~1.5 hr

### Deliverables:
- [ ] `src/components/AutomationDashboard.tsx` — run button + live log
- [ ] Server: `/api/automation/run` (done) + enhanced date extraction
- [ ] Filename parsing: `YYYYMMDD_HHMMSS` → datetime → calendar match
- [ ] Dropbox integration (optional: file search by name)
- [ ] Polling mode toggle

### Success Criteria:
- "Run Now" → processes 5 unfilled rows → matches 3 to calendar events
- Log shows real-time progress
- No false matches (within ±30 min window)

---

## Phase 7: Polish & Deploy (COMPLETION)
**Goal State**: Production-ready, deployed, documented.
**Duration**: ~1 hr

### Deliverables:
- [ ] Responsive layout (mobile-friendly)
- [ ] Error boundaries + loading states
- [ ] `vercel.json` or `railway.toml` deployment config
- [ ] `Dockerfile` (optional, for Railway)
- [ ] `README.md` with setup guide
- [ ] Cost tracking (OpenRouter usage → Firestore log)

### Success Criteria:
- Deploys to Vercel/Railway without errors
- All 7 modules functional in production
- < 3s first paint, < 500ms API responses

---

## Execution Strategy (from Ruflo's GOAP Pattern)

### Agent Coordination:
1. **Architecture Agent** (Gemini 3.1 Pro) — system design decisions, component interfaces
2. **Implementer Agent** (Claude 4.6 Sonnet) — TDD code generation, complex logic
3. **Optimizer Agent** (Kimi 2.6) — review, refactor, cost-optimize token usage

### Parallel Tracks:
- **Track A** (Backend): Phases 0-1-2 sequential → Phases 3-4-5 can parallel
- **Track B** (Frontend): Starts Phase 1 → builds UI alongside each backend phase

### Quality Gates (per phase):
1. ✅ All endpoints respond correctly
2. ✅ TypeScript compiles with no errors
3. ✅ UI renders without console errors
4. ✅ Integration test passes (end-to-end flow)

---

## Current Status

| Phase | Status | Backend | Frontend |
|-------|--------|---------|----------|
| 0. Foundation | 🟡 80% | ✅ Done | ⬜ Pending |
| 1. Auth | 🟡 50% | ✅ Done | ⬜ Pending |
| 2. Sheet Inbox | 🟡 50% | ✅ Done | ⬜ Pending |
| 3. AI Core | 🟡 50% | ✅ Done | ⬜ Pending |
| 4. Exercise Creator | 🟡 40% | ✅ Done | ⬜ Pending |
| 5. TrueCoach | 🟡 40% | ✅ Done | ⬜ Pending |
| 6. Automation | 🟡 40% | ✅ Done | ⬜ Pending |
| 7. Polish & Deploy | ⬜ 0% | ⬜ | ⬜ |

**Bottom line**: All backend services are scaffolded. The remaining work is frontend components + Vite/Tailwind setup + deployment config.
