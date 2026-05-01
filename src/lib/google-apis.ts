import { google } from "googleapis";
import { env } from "./env.ts";

/**
 * Google APIs service (Sheets, Calendar, Drive).
 * Creates an authenticated client from user tokens.
 */

export function createOAuth2Client(origin?: string) {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    origin ? `${origin}/auth/callback` : undefined
  );
}

export function getAuthenticatedClient(tokens: any) {
  const client = createOAuth2Client();
  client.setCredentials(tokens);
  return client;
}

// ── Sheets ────────────────────────────────────────────────────────────────

export interface SheetRow {
  rowIndex: number;
  status: string;
  fileName: string;
  exerciseName: string;
  videoUrl: string;
  exerciseCues: string;
  clientName: string;
  workoutDate: string;
  repsSets: string;
}

export async function getSheetInbox(
  tokens: any,
  spreadsheetId: string,
  tab?: string
): Promise<{ rows: SheetRow[]; tab: string }> {
  const auth = getAuthenticatedClient(tokens);
  const sheets = google.sheets({ version: "v4", auth });

  // Find the active tab (first visible sheet or specified tab)
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetList = meta.data.sheets ?? [];
  const targetTab =
    tab ?? sheetList.find((s) => !s.properties?.hidden)?.properties?.title ?? "Sheet1";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${targetTab}!A:H`,
  });

  const rawRows = response.data.values ?? [];
  if (rawRows.length <= 1) return { rows: [], tab: targetTab };

  const rows: SheetRow[] = rawRows.slice(1).map((row, i) => ({
    rowIndex: i + 1, // 1-indexed (skip header)
    status: row[0] ?? "",
    fileName: row[1] ?? "",
    exerciseName: row[2] ?? "",
    videoUrl: row[3] ?? "",
    exerciseCues: row[4] ?? "",
    clientName: row[5] ?? "",
    workoutDate: row[6] ?? "",
    repsSets: row[7] ?? "",
  }));

  return { rows, tab: targetTab };
}

export async function updateSheetRow(
  tokens: any,
  spreadsheetId: string,
  tab: string,
  rowIndex: number,
  updates: Partial<SheetRow>
) {
  const auth = getAuthenticatedClient(tokens);
  const sheets = google.sheets({ version: "v4", auth });

  // Map fields to column letters
  const columnMap: Record<string, string> = {
    status: "A",
    fileName: "B",
    exerciseName: "C",
    videoUrl: "D",
    exerciseCues: "E",
    clientName: "F",
    workoutDate: "G",
    repsSets: "H",
  };

  const data: { range: string; values: string[][] }[] = [];
  for (const [key, value] of Object.entries(updates)) {
    const col = columnMap[key];
    if (col && value !== undefined) {
      data.push({
        range: `${tab}!${col}${rowIndex + 1}`, // +1 for header row
        values: [[String(value)]],
      });
    }
  }

  if (data.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data,
    },
  });
}

// ── Calendar ──────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  attendees?: string[];
}

export async function getCalendarEvents(
  tokens: any,
  timeMin: string,
  timeMax: string,
  calendarFilter?: string
): Promise<CalendarEvent[]> {
  const auth = getAuthenticatedClient(tokens);
  const calendar = google.calendar({ version: "v3", auth });

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    q: calendarFilter || undefined,
  });

  return (response.data.items ?? []).map((event) => ({
    id: event.id ?? "",
    summary: event.summary ?? "",
    start: event.start?.dateTime ?? event.start?.date ?? "",
    end: event.end?.dateTime ?? event.end?.date ?? "",
    attendees: event.attendees?.map((a) => a.displayName ?? a.email ?? "") ?? [],
  }));
}

// ── Drive ─────────────────────────────────────────────────────────────────

export async function getDriveFileMetadata(tokens: any, fileId: string) {
  const auth = getAuthenticatedClient(tokens);
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,createdTime,modifiedTime,webViewLink,webContentLink",
  });

  return response.data;
}

export async function listDriveFolder(tokens: any, folderId: string) {
  const auth = getAuthenticatedClient(tokens);
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,createdTime,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
  });

  return response.data.files ?? [];
}
