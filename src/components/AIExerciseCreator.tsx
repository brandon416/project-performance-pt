import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Upload, Loader2, CheckCircle, Dumbbell } from "lucide-react";

export function AIExerciseCreator() {
  const { googleTokens } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    exercise_name: string;
    exercise_cues: string[];
    sets_reps: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("media", file);
      formData.append(
        "config",
        JSON.stringify({ googleTokens })
      );

      const res = await fetch("/api/automation/analyze-media", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
      toast.success(`Analyzed: ${data.exercise_name}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-semibold">AI Exercise Creator</h2>
      <p className="text-sm text-muted-foreground">
        Upload a video or image → AI identifies the exercise, generates clinical cues, and syncs to
        Google Sheets + TrueCoach.
      </p>

      {/* Upload Zone */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 transition"
      >
        <input
          ref={fileRef}
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
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
        disabled={!file || analyzing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
      >
        {analyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Dumbbell className="w-5 h-5" />
            Analyze Exercise
          </>
        )}
      </button>

      {/* Results */}
      {result && (
        <div className="border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">{result.exercise_name}</h3>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Clinical Cues:</p>
            <ul className="space-y-1">
              {result.exercise_cues.map((cue, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-primary">•</span>
                  {cue}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Sets/Reps:</p>
            <p className="text-sm mt-1">{result.sets_reps}</p>
          </div>
        </div>
      )}
    </div>
  );
}
