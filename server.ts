import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

import { env } from "./src/lib/env.ts";
import openrouter, { MODELS, analyzeExerciseMedia, streamChat, generateExerciseCues } from "./src/lib/openrouter.ts";
import { createOAuth2Client, getSheetInbox, updateSheetRow, getCalendarEvents, listDriveFolder } from "./src/lib/google-apis.ts";
import { truecoachService } from "./src/lib/truecoach.ts";
import { acuityService } from "./src/lib/acuity.ts";

// Bypass TrueCoach TLS cert issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = parseInt(env.PORT);

app.use(cors({ origin: env.APP_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ── Health ────────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ── Auth ──────────────────────────────────────────────────────────────────
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

app.get("/api/auth/url", (req, res) => {
  let origin = typeof req.query.origin === "string" ? req.query.origin : `https://${req.headers.host}`;
  origin = origin.replace(/\/$/, "");
  const client = createOAuth2Client(`${origin}/auth/callback`);

  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: Buffer.from(origin).toString("base64"),
  });
  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;
  let origin = `https://${req.headers.host}`;
  if (typeof state === "string") {
    try { origin = Buffer.from(state, "base64").toString("utf-8"); } catch {}
  }

  const client = createOAuth2Client(`${origin}/auth/callback`);
  try {
    const { tokens } = await client.getToken(code as string);
    res.send(`<html><body><script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
        window.close();
      } else {
        localStorage.setItem('pending_oauth_tokens', JSON.stringify(${JSON.stringify(tokens)}));
        window.location.href = '/';
      }
    </script></body></html>`);
  } catch (err: any) {
    res.status(500).send(`Auth failed: ${err.message}`);
  }
});

// ── Sheets ────────────────────────────────────────────────────────────────
app.post("/api/sheets/inbox", async (req, res) => {
  try {
    const { config } = req.body;
    const tokens = config?.googleTokens;
    if (!tokens) return res.status(401).json({ error: "No Google tokens" });

    const spreadsheetId = config?.spreadsheetId ?? "1WYvBQhOkw1sQRBbVB7PwUMqZuwF-fX_69i4IGW18-Zg";
    const result = await getSheetInbox(tokens, spreadsheetId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sheets/update-row", async (req, res) => {
  try {
    const { config, rowIndex, updates, tab } = req.body;
    const tokens = config?.googleTokens;
    if (!tokens) return res.status(401).json({ error: "No Google tokens" });

    const spreadsheetId = config?.spreadsheetId ?? "1WYvBQhOkw1sQRBbVB7PwUMqZuwF-fX_69i4IGW18-Zg";
    await updateSheetRow(tokens, spreadsheetId, tab, rowIndex, updates);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sheets/update-multiple-rows", async (req, res) => {
  try {
    const { config, rowsUpdates, tab } = req.body;
    const tokens = config?.googleTokens;
    if (!tokens) return res.status(401).json({ error: "No Google tokens" });

    const spreadsheetId = config?.spreadsheetId ?? "1WYvBQhOkw1sQRBbVB7PwUMqZuwF-fX_69i4IGW18-Zg";
    for (const { rowIndex, updates } of rowsUpdates) {
      await updateSheetRow(tokens, spreadsheetId, tab, rowIndex, updates);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Chat (Streaming SSE) ──────────────────────────────────────────────
app.post("/api/ai/chat", async (req, res) => {
  const { messages, model, systemPrompt } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    for await (const chunk of streamChat(messages, { model, systemPrompt })) {
      res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── AI Exercise Cues (Lite) ──────────────────────────────────────────────
app.post("/api/ai/cues", async (req, res) => {
  try {
    const { exerciseName, model } = req.body;
    if (!exerciseName) return res.status(400).json({ error: "exerciseName required" });

    const result = await generateExerciseCues(exerciseName, { model });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Media Analysis (Exercise Creator) ─────────────────────────────────
app.post("/api/automation/analyze-media", upload.single("media"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const config = JSON.parse(req.body.config || "{}");
    const filePath = req.file.path;
    const mimeType = req.file.mimetype;

    // Read file as base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");

    // Analyze with OpenRouter
    const analysis = await analyzeExerciseMedia(base64Data, mimeType);

    // Write to Google Sheet if tokens available
    const tokens = config?.googleTokens;
    if (tokens) {
      const spreadsheetId = config?.spreadsheetId ?? "1WYvBQhOkw1sQRBbVB7PwUMqZuwF-fX_69i4IGW18-Zg";
      // Find next empty row and write
      const { rows, tab } = await getSheetInbox(tokens, spreadsheetId);
      const nextRow = rows.length + 1; // After last row
      await updateSheetRow(tokens, spreadsheetId, tab, nextRow, {
        exerciseName: analysis.exercise_name,
        exerciseCues: analysis.exercise_cues.join("\n• "),
        repsSets: analysis.sets_reps,
      });
    }

    // Sync to TrueCoach if configured
    if (config?.truecoachToken && config?.clientName) {
      await truecoachService.syncExerciseToWorkout(config.truecoachToken, {
        exerciseName: analysis.exercise_name,
        videoUrl: config.videoUrl ?? "",
        exerciseCues: analysis.exercise_cues.join("\n• "),
        clientName: config.clientName,
        workoutDate: config.workoutDate ?? new Date().toISOString().split("T")[0],
        repsSets: analysis.sets_reps,
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      exercise_name: analysis.exercise_name,
      exercise_cues: analysis.exercise_cues,
      sets_reps: analysis.sets_reps,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Drive (Exercise Demo Folder) ─────────────────────────────────────────
app.post("/api/drive/exercise-folder", async (req, res) => {
  try {
    const { config } = req.body;
    const tokens = config?.googleTokens;
    if (!tokens) return res.status(401).json({ error: "No Google tokens" });

    // Default folder: "02 Exercise demo" — user can override via config.driveFolderId
    const folderId = config?.driveFolderId ?? "root";
    const files = await listDriveFolder(tokens, folderId);
    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── TrueCoach Proxy ──────────────────────────────────────────────────────
app.post("/api/truecoach/proxy", async (req, res) => {
  try {
    const { token, method, endpoint, payload } = req.body;
    if (!token) return res.status(401).json({ error: "No TrueCoach token" });

    const url = `https://app.truecoach.co/proxy/api${endpoint}`;
    const response = await fetch(url, {
      method: method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Role: "Trainer",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: JSON.stringify(data) });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── TrueCoach Convenience Endpoints ──────────────────────────────────────
app.post("/api/truecoach/shift-workouts", async (req, res) => {
  try {
    const { token, clientId, days } = req.body;
    const results = await truecoachService.shiftWorkouts(token, clientId, days ?? 7);
    res.json({ success: true, count: results.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Acuity ────────────────────────────────────────────────────────────────
app.post("/api/acuity/appointments", async (req, res) => {
  try {
    const { clientName, type } = req.body;
    if (type === "recent") {
      const apt = await acuityService.getMostRecentAppointment(clientName);
      res.json({ appointment: apt });
    } else if (type === "next") {
      const apt = await acuityService.getNextAppointment(clientName);
      res.json({ appointment: apt });
    } else {
      const appointments = await acuityService.getAppointments(req.body);
      res.json({ appointments });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Automation Run ────────────────────────────────────────────────────────
app.post("/api/automation/run", async (req, res) => {
  try {
    const { config } = req.body;
    const tokens = config?.googleTokens;
    if (!tokens) return res.status(401).json({ error: "No Google tokens" });

    const spreadsheetId = config?.spreadsheetId ?? "1WYvBQhOkw1sQRBbVB7PwUMqZuwF-fX_69i4IGW18-Zg";
    const { rows, tab } = await getSheetInbox(tokens, spreadsheetId);

    const results = [];
    for (const row of rows) {
      // Process rows with filename but no client name
      if (row.fileName && !row.clientName) {
        try {
          // Try to match to calendar event by timestamp in filename
          const dateMatch = row.fileName.match(/(\d{4})(\d{2})(\d{2})/);
          if (dateMatch) {
            const dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
            const events = await getCalendarEvents(
              tokens,
              `${dateStr}T00:00:00Z`,
              `${dateStr}T23:59:59Z`,
              config?.calendarFilter
            );

            if (events.length > 0) {
              // Match first event's attendee as client
              const event = events[0];
              const clientName = event.attendees?.[0] ?? event.summary;
              await updateSheetRow(tokens, spreadsheetId, tab, row.rowIndex, {
                clientName,
                workoutDate: dateStr,
                status: "AUTO-FILLED",
              });
              results.push({ row: row.rowIndex, fileName: row.fileName, clientName, status: "AUTO-FILLED" });
            }
          }
        } catch (err: any) {
          results.push({ row: row.rowIndex, fileName: row.fileName, status: "ERROR", error: err.message });
        }
      }
    }

    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Vite Dev Server (development only) ───────────────────────────────────
async function startServer() {
  if (env.NODE_ENV === "development") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve built frontend in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (_, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 Project Performance PT running on http://localhost:${PORT}`);
  });
}

startServer();
