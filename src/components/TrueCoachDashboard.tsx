import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Copy, Users, Loader2 } from "lucide-react";

export function TrueCoachDashboard() {
  const { googleTokens } = useAuth();
  const [activeSection, setActiveSection] = useState<"upload" | "copy" | "insights">("upload");

  // --- Upload Section ---
  const [exerciseName, setExerciseName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!exerciseName) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("truecoach_token");
      if (!token) throw new Error("TrueCoach token not set. Add it in settings.");

      await fetch("/api/truecoach/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          method: "POST",
          endpoint: "/exercises",
          payload: { exercise: { exercise_name: exerciseName, url: videoUrl, description } },
        }),
      });
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

  // --- Copy Section ---
  const [clientId, setClientId] = useState("");
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    if (!clientId) return;
    setCopying(true);
    try {
      const token = localStorage.getItem("truecoach_token");
      if (!token) throw new Error("TrueCoach token not set");

      const res = await fetch("/api/truecoach/shift-workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, clientId, days: 7 }),
      });
      const data = await res.json();
      toast.success(`Copied ${data.count} workouts → next week (hidden)`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCopying(false);
    }
  };

  const sections = [
    { id: "upload" as const, label: "Library Upload", icon: <Plus className="w-4 h-4" /> },
    { id: "copy" as const, label: "+7 Day Copier", icon: <Copy className="w-4 h-4" /> },
    { id: "insights" as const, label: "Client Insights", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">TrueCoach Dashboard</h2>

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
            placeholder="Exercise name"
            className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm"
          />
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Video URL (optional)"
            className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Exercise cues / description"
            rows={4}
            className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm resize-none"
          />
          <button
            onClick={handleUpload}
            disabled={!exerciseName || uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add to Library
          </button>
        </div>
      )}

      {/* +7 Day Copy */}
      {activeSection === "copy" && (
        <div className="space-y-4 max-w-lg">
          <p className="text-sm text-muted-foreground">
            Clone a client's last 7 days of workouts to the next week (hidden by default).
          </p>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Client ID"
            className="w-full px-4 py-2 rounded-md border border-input bg-background text-sm"
          />
          <button
            onClick={handleCopy}
            disabled={!clientId || copying}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            Copy → Next Week
          </button>
        </div>
      )}

      {/* Client Insights */}
      {activeSection === "insights" && (
        <div className="text-muted-foreground text-sm">
          Client insights panel — shows sessions remaining, next Acuity appointment, and today's
          workout. Coming in Phase 5 refinement.
        </div>
      )}
    </div>
  );
}
