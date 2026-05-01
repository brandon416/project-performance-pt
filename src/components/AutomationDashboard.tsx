import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Play, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface AutoResult {
  row: number;
  fileName: string;
  clientName?: string;
  status: string;
  error?: string;
}

export function AutomationDashboard() {
  const { googleTokens } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<AutoResult[]>([]);

  const handleRun = async () => {
    if (!googleTokens) {
      toast.error("Connect Google first");
      return;
    }
    setRunning(true);
    setResults([]);
    try {
      const res = await fetch("/api/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { googleTokens } }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results);
      toast.success(`Processed ${data.results.length} rows`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Automation Engine</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Matches video filenames → Google Calendar events → fills client name + workout date.
          </p>
        </div>
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

      {/* Results Log */}
      {results.length > 0 && (
        <div className="border border-border rounded-lg divide-y divide-border">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-3 text-sm">
              {r.status === "AUTO-FILLED" ? (
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className="font-mono text-xs text-muted-foreground">Row {r.row}</span>
              <span className="truncate">{r.fileName}</span>
              {r.clientName && (
                <span className="ml-auto text-green-600 font-medium">{r.clientName}</span>
              )}
              {r.error && <span className="ml-auto text-red-500 text-xs">{r.error}</span>}
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !running && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Hit "Run Now" to process unfilled rows in your sheet.
        </div>
      )}
    </div>
  );
}
