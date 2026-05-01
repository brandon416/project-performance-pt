import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Play,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  FileVideo,
  Calendar,
  User,
  Settings,
  RotateCcw,
} from "lucide-react";

interface AutoResult {
  row: number;
  fileName: string;
  clientName?: string;
  workoutDate?: string;
  status: string;
  error?: string;
}

interface AutoConfig {
  calendarFilter?: string;
  filenamePattern?: string;
}

export function AutomationDashboard() {
  const { googleTokens } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<AutoResult[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<AutoConfig>({
    calendarFilter: "",
    filenamePattern: "YYYYMMDD",
  });
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleRun = async () => {
    if (!googleTokens) {
      toast.error("Connect Google first");
      return;
    }
    setRunning(true);
    setResults([]);
    setProgress(null);

    try {
      const res = await fetch("/api/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            googleTokens,
            calendarFilter: config.calendarFilter || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results);

      const filled = data.results.filter((r: AutoResult) => r.status === "AUTO-FILLED").length;
      const errors = data.results.filter((r: AutoResult) => r.status === "ERROR").length;
      toast.success(`Done! ${filled} matched, ${errors} errors, ${data.results.length} total processed`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const stats = {
    total: results.length,
    filled: results.filter((r) => r.status === "AUTO-FILLED").length,
    errors: results.filter((r) => r.status === "ERROR").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Automation Engine</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Video filename → Google Calendar → client + date matching → auto-fill Sheet rows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-md hover:bg-secondary"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run Now
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-3">
          <h3 className="text-sm font-medium">Matching Configuration</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">Calendar Filter</label>
              <input
                value={config.calendarFilter || ""}
                onChange={(e) => setConfig({ ...config, calendarFilter: e.target.value })}
                placeholder="e.g., 'PT Session' or leave blank for all"
                className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Filename Date Pattern</label>
              <select
                value={config.filenamePattern}
                onChange={(e) => setConfig({ ...config, filenamePattern: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="YYYYMMDD">YYYYMMDD (e.g., 20260501)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2026-05-01)</option>
                <option value="MMDDYYYY">MMDDYYYY (e.g., 05012026)</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The engine extracts dates from filenames, looks up Calendar events on that date, and matches the attendee as the client name.
          </p>
        </div>
      )}

      {/* How It Works */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-start gap-3 p-4 border border-border rounded-lg">
          <FileVideo className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">1. Parse Filename</p>
            <p className="text-xs text-muted-foreground">
              Extract date from video filename (e.g., "20260501_squat.mp4" → May 1, 2026)
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 border border-border rounded-lg">
          <Calendar className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">2. Match Calendar</p>
            <p className="text-xs text-muted-foreground">
              Find PT session on that date from Google Calendar events
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 border border-border rounded-lg">
          <User className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">3. Auto-Fill Client</p>
            <p className="text-xs text-muted-foreground">
              Set client name + workout date in the Sheet row
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      {running && progress && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm">
            Processing row {progress.current} of {progress.total}...
          </span>
        </div>
      )}

      {/* Stats */}
      {results.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {stats.filled} matched
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle className="w-4 h-4 text-red-500" />
            {stats.errors} errors
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {stats.total} processed
          </span>
        </div>
      )}

      {/* Results Log */}
      {results.length > 0 && (
        <div className="border border-border rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-3 text-sm">
              {r.status === "AUTO-FILLED" ? (
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className="font-mono text-xs text-muted-foreground w-12">Row {r.row}</span>
              <span className="truncate flex-1 font-medium">{r.fileName}</span>
              {r.clientName && (
                <span className="flex items-center gap-1 text-green-600 text-xs">
                  <User className="w-3 h-3" />
                  {r.clientName}
                </span>
              )}
              {r.workoutDate && (
                <span className="flex items-center gap-1 text-blue-600 text-xs">
                  <Calendar className="w-3 h-3" />
                  {r.workoutDate}
                </span>
              )}
              {r.error && (
                <span className="text-red-500 text-xs truncate max-w-[200px]">{r.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !running && (
        <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          <RotateCcw className="w-8 h-8 mx-auto mb-3 opacity-50" />
          Hit "Run Now" to process unfilled rows in your Master Exercise Library.
        </div>
      )}
    </div>
  );
}
