import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  ImageIcon, Loader2, CheckCircle2, AlertTriangle,
  AlertCircle, X, ArrowLeft, RefreshCw, Microscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ML_SERVER = "http://localhost:8000";

interface Prediction {
  success: boolean;
  prediction: string;
  confidence: number;
  severity: "none" | "low" | "moderate" | "high" | "unknown";
  description: string;
  recommendation: string;
  all_predictions: { label: string; confidence: number }[];
}

const severityConfig = {
  none:     { color: "text-green-500",  bg: "bg-green-500/10",  border: "border-green-500/20",  icon: CheckCircle2,  label: "Healthy"       },
  low:      { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: AlertCircle,   label: "Low Risk"      },
  moderate: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: AlertTriangle, label: "Moderate Risk" },
  high:     { color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/20",    icon: AlertTriangle, label: "High Risk"     },
  unknown:  { color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border",       icon: AlertCircle,   label: "Unknown"       },
};

const skinConditionEmoji: Record<string, string> = {
  "Acne":      "😣",
  "Carcinoma": "⚠️",
  "Eczema":    "🔴",
  "Keratosis": "🟠",
  "Milia":     "🔵",
  "Psoriasis": "🟡",
  "Rosacea":   "🌸",
  "Normal":    "✨",
};

export default function SkinDiseaseDetector() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f); setResult(null); setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsLoading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${ML_SERVER}/predict/skin`, { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Prediction failed"); }
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message || "Could not connect to ML server on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => { setImage(null); setFile(null); setResult(null); setError(null); };

  const severity    = result ? severityConfig[result.severity] : null;
  const SeverityIcon = severity?.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/chat")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center">
            <Microscope className="w-4 h-4 text-pink-500" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-sm">Skin Disease Detector</h1>
            <p className="text-xs text-muted-foreground">AI-powered dermatology analysis</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Disclaimer */}
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-600 dark:text-yellow-400 leading-relaxed">
            This tool is for informational purposes only. Always consult a qualified dermatologist for diagnosis and treatment.
          </p>
        </div>

        {/* What we can detect */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detectable Conditions</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(skinConditionEmoji).map(([condition, emoji]) => (
              <span key={condition} className="text-xs bg-muted px-3 py-1.5 rounded-full text-foreground font-medium">
                {emoji} {condition}
              </span>
            ))}
          </div>
        </div>

        {/* Upload area */}
        {!image ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-200",
              isDragging ? "border-pink-500 bg-pink-500/5 scale-[1.01]" : "border-border hover:border-pink-500/40 hover:bg-muted/30"
            )}
          >
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-pink-500" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Upload Skin Image</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Take a clear photo of the affected skin area and upload it here
            </p>
            <div className="flex gap-2 justify-center">
              {["JPG", "PNG", "WEBP"].map((f) => (
                <span key={f} className="bg-muted px-2 py-1 rounded-full text-xs text-muted-foreground">{f}</span>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image preview */}
            <div className="relative rounded-3xl overflow-hidden border border-border bg-card">
              <img src={image} alt="Skin" className="w-full object-cover max-h-80" />
              <button onClick={handleReset}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-background">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur rounded-xl px-3 py-1.5 text-xs font-medium border border-border">
                {file?.name}
              </div>
            </div>

            {/* Analyze button */}
            {!result && (
              <Button onClick={handleAnalyze} disabled={isLoading}
                className="w-full h-12 text-base font-semibold bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/20 rounded-2xl">
                {isLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                  : <><Microscope className="w-4 h-4 mr-2" />Analyze Skin</>
                }
              </Button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && severity && SeverityIcon && (
          <div className="space-y-4">
            {/* Main result */}
            <div className={cn("rounded-3xl border p-6", severity.bg, severity.border)}>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-4xl">
                  {skinConditionEmoji[result.prediction] || "🩺"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-xl">{result.prediction}</h3>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", severity.bg, severity.color, severity.border)}>
                      {severity.label}
                    </span>
                  </div>
                  <p className={cn("text-sm font-medium", severity.color)}>
                    {result.confidence.toFixed(1)}% confidence
                  </p>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="h-2 bg-background/50 rounded-full overflow-hidden mb-4">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000",
                    result.severity === "none" ? "bg-green-500" :
                    result.severity === "low" ? "bg-yellow-500" :
                    result.severity === "moderate" ? "bg-orange-500" : "bg-red-500"
                  )}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{result.description}</p>
            </div>

            {/* Recommendation */}
            <div className="bg-card border border-border rounded-3xl p-5">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Microscope className="w-4 h-4 text-pink-500" />
                Recommendation
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.recommendation}</p>
            </div>

            {/* Top predictions */}
            <div className="bg-card border border-border rounded-3xl p-5">
              <h4 className="font-semibold text-foreground mb-3">Top Predictions</h4>
              <div className="space-y-3">
                {result.all_predictions.map((p, i) => (
                  <div key={p.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-sm font-medium flex items-center gap-1.5", i === 0 ? "text-foreground" : "text-muted-foreground")}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                        {skinConditionEmoji[p.label]} {p.label}
                      </span>
                      <span className="text-sm font-semibold">{p.confidence.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", i === 0 ? "bg-pink-500" : "bg-muted-foreground/30")}
                        style={{ width: `${p.confidence}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity warning for high risk */}
            {result.severity === "high" && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  High risk condition detected. Please consult a dermatologist or doctor as soon as possible.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1 rounded-2xl gap-2">
                <RefreshCw className="w-4 h-4" /> Analyze Another
              </Button>
              <Button onClick={() => navigate("/find-doctor")}
                className="flex-1 rounded-2xl gap-2 bg-pink-500 hover:bg-pink-600 text-white">
                <Microscope className="w-4 h-4" /> Find Dermatologist
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}