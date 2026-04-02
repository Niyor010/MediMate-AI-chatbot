import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ImageIcon, Loader2, CheckCircle2, AlertTriangle, AlertCircle, X, ArrowLeft, Stethoscope, RefreshCw } from "lucide-react";
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
  none:     { color: "text-green-500",  bg: "bg-green-500/10",  border: "border-green-500/20",  icon: CheckCircle2,  label: "Healthy" },
  low:      { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: AlertCircle,   label: "Low Risk" },
  moderate: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: AlertTriangle, label: "Moderate Risk" },
  high:     { color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/20",    icon: AlertTriangle, label: "High Risk" },
  unknown:  { color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border",       icon: AlertCircle,   label: "Unknown" },
};

export default function OralDiseaseDetector() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file"); return; }
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
      const res = await fetch(`${ML_SERVER}/predict/oral`, { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Prediction failed"); }
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message || "Could not connect to ML server on port 8000.");
    } finally { setIsLoading(false); }
  };

  const handleReset = () => { setImage(null); setFile(null); setResult(null); setError(null); };
  const severity = result ? severityConfig[result.severity] : null;
  const SeverityIcon = severity?.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/chat")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-sm">Oral Disease Detector</h1>
            <p className="text-xs text-muted-foreground">AI-powered dental analysis</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-600 dark:text-yellow-400 leading-relaxed">
            This tool is for informational purposes only. Always consult a qualified dentist.
          </p>
        </div>

        {!image ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn("border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-200",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30")}
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Upload Oral Image</h3>
            <p className="text-sm text-muted-foreground mb-4">Drag & drop or click to upload a photo of your teeth</p>
            <div className="flex gap-2 justify-center">
              {["JPG", "PNG", "WEBP"].map((f) => <span key={f} className="bg-muted px-2 py-1 rounded-full text-xs text-muted-foreground">{f}</span>)}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden border border-border bg-card">
              <img src={image} alt="Uploaded" className="w-full object-cover max-h-80" />
              <button onClick={handleReset} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur rounded-xl px-3 py-1.5 text-xs font-medium border border-border">{file?.name}</div>
            </div>
            {!result && (
              <Button onClick={handleAnalyze} disabled={isLoading} className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 rounded-2xl">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Stethoscope className="w-4 h-4 mr-2" />Analyze Image</>}
              </Button>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {result && severity && SeverityIcon && (
          <div className="space-y-4">
            <div className={cn("rounded-3xl border p-6", severity.bg, severity.border)}>
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", severity.bg)}>
                  <SeverityIcon className={cn("w-5 h-5", severity.color)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-lg">{result.prediction}</h3>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", severity.bg, severity.color, severity.border)}>{severity.label}</span>
                  </div>
                  <p className={cn("text-sm font-medium", severity.color)}>{result.confidence.toFixed(1)}% confidence</p>
                </div>
              </div>
              <div className="h-2 bg-background/50 rounded-full overflow-hidden mb-4">
                <div className={cn("h-full rounded-full transition-all duration-1000",
                  result.severity === "none" ? "bg-green-500" : result.severity === "low" ? "bg-yellow-500" : result.severity === "moderate" ? "bg-orange-500" : "bg-red-500"
                )} style={{ width: `${result.confidence}%` }} />
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{result.description}</p>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary" />Recommendation</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.recommendation}</p>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5">
              <h4 className="font-semibold text-foreground mb-3">Top Predictions</h4>
              <div className="space-y-3">
                {result.all_predictions.map((p, i) => (
                  <div key={p.label}>
                    <div className="flex justify-between mb-1">
                      <span className={cn("text-sm font-medium", i === 0 ? "text-foreground" : "text-muted-foreground")}>
                        {i === 0 ? "🥇 " : i === 1 ? "🥈 " : "🥉 "}{p.label}
                      </span>
                      <span className="text-sm font-semibold">{p.confidence.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", i === 0 ? "bg-primary" : "bg-muted-foreground/30")} style={{ width: `${p.confidence}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1 rounded-2xl gap-2"><RefreshCw className="w-4 h-4" />Analyze Another</Button>
              <Button onClick={() => navigate("/find-doctor")} className="flex-1 rounded-2xl gap-2 bg-primary hover:bg-primary/90"><Stethoscope className="w-4 h-4" />Find a Dentist</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}