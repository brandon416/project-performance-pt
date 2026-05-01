import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  CheckCircle,
  Dumbbell,
  FolderOpen,
  Sparkles,
  ArrowRight,
  Video,
  Image as ImageIcon,
} from "lucide-react";

interface AnalysisResult {
  exercise_name: string;
  exercise_cues: string[];
  sets_reps: string;
}

type Step = "upload" | "analyzing" | "review" | "synced";

export function AIExerciseCreator() {
  const { googleTokens } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editedResult, setEditedResult] = useState<AnalysisResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Drive folder browsing
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [showDrive, setShowDrive] = useState(false);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setStep("upload");
    setResult(null);
    setEditedResult(null);

    // Create preview
    if (f.type.startsWith("video/")) {
      setPreview(URL.createObjectURL(f));
    } else if (f.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, []);

  const fetchDriveFiles = async () => {
    if (!googleTokens) return;
    setLoadingDrive(true);
    try {
      const res = await fetch("/api/drive/exercise-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { googleTokens } }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDriveFiles(data.files || []);
      setShowDrive(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep("analyzing");

    try {
      const formData = new FormData();
      formData.append("media", file);
      formData.append("config", JSON.stringify({ googleTokens }));

      const res = await fetch("/api/automation/analyze-media", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      setEditedResult(data);
      setStep("review");
      toast.success(`Identified: ${data.exercise_name}`);
    } catch (err: any) {
      toast.error(err.message);
      setStep("upload");
    }
  };

  const handleSync = async () => {
    if (!editedResult) return;
    setSyncing(true);
    try {
      // Sync to Sheet (already done during analysis)
      // Optionally sync to TrueCoach
      const truecoachToken = localStorage.getItem("truecoach_token");
      if (truecoachToken) {
        await fetch("/api/truecoach/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: truecoachToken,
            method: "POST",
            endpoint: "/exercises",
            payload: {
              exercise: {
                exercise_name: editedResult.exercise_name,
                description: editedResult.exercise_cues.join("\n• "),
              },
            },
          }),
        });
      }
      setStep("synced");
      toast.success("Synced to Sheet + TrueCoach");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setStep("upload");
    setResult(null);
    setEditedResult(null);
  };

  if (!googleTokens) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Connect Google to use the Exercise Creator.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">AI Exercise Creator</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload → AI identifies exercise → generates clinical cues → syncs to Sheet + TrueCoach
          </p>
        </div>
        {step !== "upload" && (
          <button onClick={reset} className="text-sm text-primary hover:underline">
            Start Over
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        {["Upload", "AI Analysis", "Review & Edit", "Synced"].map((label, i) => {
          const stepIndex = ["upload", "analyzing", "review", "synced"].indexOf(step);
          const isActive = i === stepIndex;
          const isDone = i < stepIndex;
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                    ? "bg-green-100 text-green-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Upload Step */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* Drive Browser Toggle */}
          <button
            onClick={fetchDriveFiles}
            disabled={loadingDrive}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FolderOpen className="w-4 h-4" />
            {loadingDrive ? "Loading..." : "Browse 02 Exercise Demo folder"}
          </button>

          {showDrive && driveFiles.length > 0 && (
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border">
              {driveFiles.map((f: any) => (
                <button
                  key={f.id}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 text-left text-sm"
                  onClick={() => {
                    toast.info(`Drive file selected: ${f.name}. For now, please upload the local file.`);
                  }}
                >
                  {f.mimeType?.includes("video") ? (
                    <Video className="w-4 h-4 text-blue-500" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-green-500" />
                  )}
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition"
          >
            <input
              ref={fileRef}
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
            {file ? (
              <div className="space-y-3">
                <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
                <p className="font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB •{" "}
                  {file.type.startsWith("video") ? "Video" : "Image"}
                </p>
                {preview && file.type.startsWith("video") && (
                  <video src={preview} className="mx-auto max-h-40 rounded" controls muted />
                )}
                {preview && file.type.startsWith("image") && (
                  <img src={preview} className="mx-auto max-h-40 rounded object-contain" />
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Drop video/image or click to browse</p>
                <p className="text-xs text-muted-foreground">MP4, MOV, JPG, PNG up to 50MB</p>
              </div>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!file}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            Analyze with AI
          </button>
        </div>
      )}

      {/* Analyzing Step */}
      {step === "analyzing" && (
        <div className="text-center py-12 space-y-4">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
          <p className="font-medium">Analyzing exercise...</p>
          <p className="text-sm text-muted-foreground">
            AI is identifying the movement, joint actions, and generating clinical cues
          </p>
        </div>
      )}

      {/* Review Step */}
      {step === "review" && editedResult && (
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Exercise Name</label>
              <input
                value={editedResult.exercise_name}
                onChange={(e) =>
                  setEditedResult({ ...editedResult, exercise_name: e.target.value })
                }
                className="mt-1 w-full px-4 py-2 rounded-md border border-input bg-background font-medium"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Clinical Cues ({editedResult.exercise_cues.length})
              </label>
              {editedResult.exercise_cues.map((cue, i) => (
                <input
                  key={i}
                  value={cue}
                  onChange={(e) => {
                    const newCues = [...editedResult.exercise_cues];
                    newCues[i] = e.target.value;
                    setEditedResult({ ...editedResult, exercise_cues: newCues });
                  }}
                  className="mt-1 w-full px-4 py-2 rounded-md border border-input bg-background text-sm"
                />
              ))}
              <button
                onClick={() =>
                  setEditedResult({
                    ...editedResult,
                    exercise_cues: [...editedResult.exercise_cues, ""],
                  })
                }
                className="mt-2 text-xs text-primary hover:underline"
              >
                + Add cue
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Sets / Reps</label>
              <input
                value={editedResult.sets_reps}
                onChange={(e) =>
                  setEditedResult({ ...editedResult, sets_reps: e.target.value })
                }
                className="mt-1 w-full px-4 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Dumbbell className="w-5 h-5" />
            )}
            Sync to Sheet + TrueCoach
          </button>
        </div>
      )}

      {/* Synced Step */}
      {step === "synced" && (
        <div className="text-center py-12 space-y-4">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
          <p className="text-lg font-semibold">Exercise Synced!</p>
          <p className="text-sm text-muted-foreground">
            "{editedResult?.exercise_name}" has been added to your Master Exercise Library and
            TrueCoach.
          </p>
          <button onClick={reset} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
            Create Another
          </button>
        </div>
      )}
    </div>
  );
}
