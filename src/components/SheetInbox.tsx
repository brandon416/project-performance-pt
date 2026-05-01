import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { RefreshCw, Check, X, Edit3, Save } from "lucide-react";

interface SheetRow {
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

export function SheetInbox() {
  const { googleTokens } = useAuth();
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [tab, setTab] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<SheetRow>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const fetchInbox = async () => {
    if (!googleTokens) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sheets/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { googleTokens } }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRows(data.rows);
      setTab(data.tab);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [googleTokens]);

  const handleSave = async (rowIndex: number) => {
    try {
      await fetch("/api/sheets/update-row", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { googleTokens }, rowIndex, updates: editValues, tab }),
      });
      toast.success("Row saved");
      setEditingRow(null);
      fetchInbox();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBulkSkip = async () => {
    if (selected.size === 0) return;
    try {
      const rowsUpdates = Array.from(selected).map((rowIndex) => ({
        rowIndex,
        updates: { status: "Skipped" },
      }));
      await fetch("/api/sheets/update-multiple-rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { googleTokens }, rowsUpdates, tab }),
      });
      toast.success(`Skipped ${selected.size} rows`);
      setSelected(new Set());
      fetchInbox();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!googleTokens) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Connect Google to view your Sheet Inbox.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Master Exercise Library V2</h2>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBulkSkip}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-destructive text-white hover:opacity-90"
            >
              <X className="w-4 h-4" />
              Skip {selected.size}
            </button>
          )}
          <button
            onClick={fetchInbox}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-secondary hover:opacity-80"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left w-8">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(new Set(rows.map((r) => r.rowIndex)));
                    } else {
                      setSelected(new Set());
                    }
                  }}
                />
              </th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Exercise</th>
              <th className="p-3 text-left">Client</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Reps/Sets</th>
              <th className="p-3 text-left w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowIndex} className="border-t border-border hover:bg-muted/50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.rowIndex)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      e.target.checked ? next.add(row.rowIndex) : next.delete(row.rowIndex);
                      setSelected(next);
                    }}
                  />
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      row.status === "Ready"
                        ? "bg-green-100 text-green-700"
                        : row.status === "Skipped"
                        ? "bg-red-100 text-red-700"
                        : row.status === "AUTO-FILLED"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {row.status || "—"}
                  </span>
                </td>
                <td className="p-3 font-medium">
                  {editingRow === row.rowIndex ? (
                    <input
                      className="border border-input rounded px-2 py-1 w-full"
                      value={editValues.exerciseName ?? row.exerciseName}
                      onChange={(e) => setEditValues({ ...editValues, exerciseName: e.target.value })}
                    />
                  ) : (
                    row.exerciseName || row.fileName || "—"
                  )}
                </td>
                <td className="p-3">{row.clientName || "—"}</td>
                <td className="p-3">{row.workoutDate || "—"}</td>
                <td className="p-3">{row.repsSets || "—"}</td>
                <td className="p-3">
                  {editingRow === row.rowIndex ? (
                    <button
                      onClick={() => handleSave(row.rowIndex)}
                      className="p-1 rounded hover:bg-green-100"
                    >
                      <Save className="w-4 h-4 text-green-600" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingRow(row.rowIndex);
                        setEditValues({});
                      }}
                      className="p-1 rounded hover:bg-secondary"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {loading ? "Loading..." : "No rows found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
