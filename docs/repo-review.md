# AI-Studio-Exercise: Full Architecture Review

## Overview
A full-stack React + Express app built in Google AI Studio that automates Brandon's PT exercise workflow between Google Sheets, TrueCoach, Acuity, and Gemini AI.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui, Framer Motion, Lucide icons
- **Backend**: Express + tsx (TypeScript runtime), multer for file uploads
- **AI**: Google Gemini (gemini-3-flash-preview) via @google/genai SDK
- **Database**: Firebase Auth + Firestore (user profiles, OAuth tokens, logs)
- **APIs**: Google Sheets, Google Calendar, Google Drive, TrueCoach (proxied), Acuity Scheduling
- **Hosting**: Google AI Studio Cloud Run

## Core Features (7 modules)

### 1. Auth (Auth.tsx)
- Firebase Auth (Google popup sign-in)
- Separate Google OAuth flow for Sheets/Calendar/Drive scopes
- Stores OAuth tokens in Firestore under `users/{uid}`

### 2. Sheet Inbox (SheetInbox.tsx)
- Reads Master Exercise Library V2 (spreadsheet: `1WYvBQhOkw1sQRBbVB7PwUMqZuwF-fX_69i4IGW18-Zg`)
- Displays rows with status, allows editing individual cells
- "Skip" bulk action for unwanted rows
- Status trigger: "Ready" → TrueCoach sync

### 3. Automation Dashboard (AutomationDashboard.tsx + automation.ts)
- "Run Now" button processes unfilled sheet rows
- Logic: For rows with file name but no client → extracts datetime from filename → matches to Google Calendar event → auto-fills client name + workout date
- Supports both Google Drive and Dropbox as video sources
- Polling mode for continuous monitoring

### 4. AI Exercise Creator (AIExerciseCreator.tsx)
- Upload video/image → server-side Gemini analysis
- Server endpoint `/api/automation/analyze-media`:
  - Uploads file to Gemini via `ai.files.upload()`
  - Structured output: exercise_name, exercise_cues (array), sets_reps
  - Auto-writes to Google Sheet + syncs to TrueCoach
  - Cross-references Google Calendar for client/date

### 5. TrueCoach Dashboard (TrueCoachDashboard.tsx)
- **Direct Library Uploader**: Push exercise (name, URL, description) to TrueCoach library
- **+7 Day Auto-Copier**: Clone last week's workouts to next week (hidden: true)
- **Client Insights**: Shows sessions remaining, recent/next Acuity appointments, today's workout, upcoming week preview
- **Recent Videos**: Shows latest entries from Sheet

### 6. Gemini Chat (GeminiChat.tsx)
- Chat interface with Gemini (client-side @google/genai SDK)
- Context about exercise library management
- Includes TrueCoach Library browser panel

### 7. Gemini Tools (GeminiTools.tsx)
- Video URL analysis (form cues, mistakes)
- Audio transcription (browser MediaRecorder → Gemini)
- Lite exercise cue generator (exercise name → structured cues)

## Server Endpoints (server.ts - ~37KB)
- `/api/auth/url` + `/auth/callback` — Google OAuth
- `/api/sheets/inbox` — Read sheet rows
- `/api/sheets/update-row` + `/api/sheets/update-multiple-rows` — Edit cells
- `/api/automation/run` — Run full automation cycle
- `/api/automation/start-polling` + `/api/automation/stop-polling` — Background monitor
- `/api/automation/analyze-media` — Gemini video analysis + sheet write + TrueCoach sync
- `/api/truecoach/proxy` — Proxy all TrueCoach API calls (bypasses CORS + TLS issues)
- `/api/truecoach/recent-videos` — Pull recent entries from sheet
- `/api/acuity/appointments` — Fetch appointments from Acuity

## Key Data Models
- **Master Exercise Library V2**: Columns A-H (Status, File Name, Exercise Name, Video URL, Exercise Cues, Client Name, Workout Date, Sets/Reps)
- **Session Tracking Sheet**: Columns A-E (Client Name, ?, Sessions Left, Full Name, TrueCoach Calendar URL)
- **Firestore**: `users/{uid}` with googleTokens, config, truecoachToken, etc.

## Environment Variables
- GEMINI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- TRUECOACH_EMAIL, TRUECOACH_PASSWORD, TRUECOACH_TRAINER_ID
- ACUITY_USER_ID, ACUITY_API_KEY

## Replication Assessment
**CAN replicate**: ✅ Yes, fully. The architecture is straightforward:
- React + Express + Vite (standard tooling)
- All API integrations use REST (Google APIs, TrueCoach, Acuity)
- Gemini can be swapped for OpenRouter models
- Firebase can be replaced with simpler auth (or kept)
- No proprietary AI Studio magic — it's just a Node.js app

**Improvements for replication**:
1. Replace client-side Gemini SDK with OpenRouter (server-side, more models)
2. Better error handling and retry logic
3. Add proper TypeScript types throughout
4. Replace Firebase with a lighter solution if desired
5. Add proper API rate limiting
6. Clean up TLS bypass hack
