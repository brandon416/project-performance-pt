import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Plus,
  Copy,
  Users,
  Loader2,
  Calendar,
  Dumbbell,
  Settings,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";

interface ClientInsight {
  id: string;
  name: string;
  email?: string;
  sessionsRemaining?: number;
  nextAppointment?: string;
  lastWorkoutDate?: string;
  todayWorkout?: string;
}

export function TrueCoachDashboard() {
  const { googleTokens } = useAuth();
  const [activeSection, setActiveSection] = useState<"upload" | "copy" | "insights">("upload");
  const [token, setToken] = useState(localStorage.getItem("truecoach_token") || "");
  const [showSettings, setShowSettings] = useState(!token);

  // --- Upload Section ---
  const [exerciseName, setExerciseName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  // --- Copy Section ---
  const [clientId, setClientId] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<{ count: number; hidden: boolean } | null>(null);

  // --- Insights Section ---
  const [clients, setClients] = useState<ClientInsight[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const saveToken = () => {
    localStorage.setItem("truecoach_token", token);
    setShowSettings(false);
    toast.success("TrueCoach token saved");
  };

  const handleUpload = async () => {
    if (!exerciseName || !token) return;
    setUploading(true);
    try {
      const res = await fetch("/api/truecoach/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          method: "POST",
          endpoint: "/exercises",
          payload: {
            exercise: {
              exercise_name: exerciseName,
              url: videoUrl || undefined,
              description: description || undefined,
            },
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`"${exerciseName}" added to TrueCoach library`);
      setExerciseName("");
      setVideoUrl("");
      setDescription("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCopy = async () => {
    if (!clientId || !token) return;
    setCopying(true);
    setCopyResult(null);
    try {
      const res = await fetch("/api/truecoach/shift-workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, clientId, days: 7 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCopyResult({ count: data.count, hidden: true });
      toast.success(`Copied ${data.count} workouts → next week`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCopying(false);
    }
  };

  const fetchClients = async () => {
    if (!token) return;
    setLoadingClients(true);
    try {
      // Get clients from TrueCoach
      const res = await fetch("/api/truecoach/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          method: "GET",
          endpoint: "/clients?page=1&per_page=50&status=active",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const clientList: ClientInsight[] = (data.clients || []).map((c: any) => ({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`.trim(),
        email: c.email,
        sessionsRemaining: c.sessions_remaining,
        lastWorkoutDate: c.last_workout_completed_at,
      }));

      // Enrich with Acuity appointments if available
      for (const client of clientList.slice(0, 10)) {
        try {
          const aptRes = await fetch("/api/acuity/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientName: client.name, type: "next" }),
          });
          const aptData = await aptRes.json();
          if (aptData.appointment) {
            client.nextAppointment = aptData.appointment.datetime;
          }
        } catch {}
      }

      setClients(clientList);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    if (activeSection === "insights" && token && clients.length === 0) {
      fetchClients();
    }
  }, [activeSection, token]);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sections = [
    { id: "upload" as const, label: "Library Upload", icon: <Plus className="w-4 h-4" /> },
    { id: "copy" as const, label: "+7 Day Copier", icon: <Copy className="w-4 h-4" /> },
    { id: "insights" as const, label: "Client Insights", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">TrueCoach Dashboard</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-md hover:bg-secondary"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-3">
          <label className="text-sm font-medium">TrueCoach API Token</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Bearer token from TrueCoach"
              className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
            />
            <button
              onClick={saveToken}
              disabled={!token}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your token from TrueCoach → Developer Settings → Personal Access Token
          </p>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-2">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition ${
              activeSection === s.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:opacity-80"
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Upload */}
      {activeSection === "upload" && (
        <div className="space-y-4 max-w-lg">
          <input
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            placeholder="Exercise name *"
            className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm"
          />
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Video URL (Google Drive, YouTube, etc.)"
            className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Exercise cues / description&#10;e.g., 8-12 reps each side x 2-3 sets&#10;4:2:4 tempo, RPE 3"
            rows={5}
            className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm resize-none"
          />
          <button
            onClick={handleUpload}
            disabled={!exerciseName || !token || uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add to TrueCoach Library
          </button>
        </div>
      )}

      {/* +7 Day Copy */}
      {activeSection === "copy" && (
        <div className="space-y-4 max-w-lg">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">How it works:</p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Fetches all workouts from the last 7 days for a client</li>
              <li>Duplicates them to the next 7 days (same relative days)</li>
              <li>New workouts are hidden by default (publish when ready)</li>
            </ol>
          </div>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Client ID (from TrueCoach URL)"
            className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm"
          />
          <button
            onClick={handleCopy}
            disabled={!clientId || !token || copying}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            Copy Last Week → Next Week (Hidden)
          </button>
          {copyResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700 flex items-center gap-2">
              <EyeOff className="w-4 h-4" />
              {copyResult.count} workouts copied (hidden). Publish them in TrueCoach when ready.
            </div>
          )}
        </div>
      )}

      {/* Client Insights */}
      {activeSection === "insights" && (
        <div className="space-y-4">
          {!token ? (
            <p className="text-muted-foreground text-sm">
              Set your TrueCoach token in settings to view client insights.
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm"
                  />
                </div>
                <button
                  onClick={fetchClients}
                  disabled={loadingClients}
                  className="px-3 py-2 rounded-md bg-secondary text-sm hover:opacity-80"
                >
                  {loadingClients ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="border border-border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{client.name}</h3>
                      {client.sessionsRemaining !== undefined && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {client.sessionsRemaining} sessions left
                        </span>
                      )}
                    </div>
                    {client.email && (
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {client.nextAppointment && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Next: {new Date(client.nextAppointment).toLocaleDateString()}
                        </span>
                      )}
                      {client.lastWorkoutDate && (
                        <span className="flex items-center gap-1">
                          <Dumbbell className="w-3 h-3" />
                          Last: {new Date(client.lastWorkoutDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredClients.length === 0 && !loadingClients && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  {clients.length === 0 ? "No clients loaded yet." : "No clients match your search."}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
