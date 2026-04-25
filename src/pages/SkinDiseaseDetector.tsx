import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import NearbyDoctorsPanel from "@/components/NearbyDoctorsPanel";
import {
  ImageIcon, Loader2, CheckCircle2, AlertTriangle,
  AlertCircle, X, ArrowLeft, RefreshCw, Microscope,
  MapPin, Navigation, Phone, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ML_SERVER    = "http://localhost:8000";
const GEOAPIFY_KEY = "8d773395039548c2b4a7b7f3731d8753"; 

interface Prediction {
  success: boolean;
  prediction: string;
  confidence: number;
  severity: "none" | "low" | "moderate" | "high" | "unknown";
  description: string;
  recommendation: string;
  all_predictions: { label: string; confidence: number }[];
}

interface NearbyDoctor {
  place_id: string;
  name: string;
  address: string;
  distance?: number;
  phone?: string;
  lat: number;
  lon: number;
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
  "Benign":    "🟢",
  "Eczema":    "🔴",
  "Infection": "⚠️",
  "Healthy":   "✨",
  "Malign":    "🚨",
  "Pigment":   "🟤",
  "Uncertain": "❓",
};

// Map skin disease → best doctor category for Geoapify
const getDoctorCategory = (disease: string): string => {
  const highRisk = ["Malign", "Carcinoma", "Infection"];
  if (highRisk.includes(disease)) return "healthcare.hospital,healthcare.clinic_or_praxis";
  return "healthcare.clinic_or_praxis";
};

const getDoctorKeyword = (disease: string): string => {
  const map: Record<string, string> = {
    "Acne":      "dermatologist acne treatment",
    "Benign":    "dermatologist skin clinic",
    "Eczema":    "dermatologist eczema treatment",
    "Infection": "dermatologist skin infection",
    "Healthy":   "dermatologist skin care",
    "Malign":    "dermatologist oncologist skin cancer",
    "Pigment":   "dermatologist pigmentation",
    "Uncertain": "dermatologist skin clinic",
  };
  return map[disease] || "dermatologist skin clinic";
};

export default function SkinDiseaseDetector() {
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [image, setImage]           = useState<string | null>(null);
  const [file, setFile]             = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [result, setResult]         = useState<Prediction | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const [doctors, setDoctors]               = useState<NearbyDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f); setResult(null); setError(null); setDoctors([]);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  // ── Fetch nearby dermatologists ────────────────────────────────────────────
  const fetchNearbyDoctors = async (disease: string) => {
    setDoctorsLoading(true);
    setDoctors([]);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      );
      const lat      = pos.coords.latitude;
      const lon      = pos.coords.longitude;
      const category = getDoctorCategory(disease);

      const url = `https://api.geoapify.com/v2/places?` +
        `categories=${category}` +
        `&filter=circle:${lon},${lat},5000` +
        `&bias=proximity:${lon},${lat}` +
        `&limit=5&apiKey=${GEOAPIFY_KEY}`;

      const res  = await fetch(url);
      const data = await res.json();

      const results: NearbyDoctor[] = (data.features || [])
        .map((f: any) => ({
          place_id: f.properties.place_id || Math.random().toString(),
          name:     f.properties.name || "Skin Clinic",
          address:  f.properties.formatted || "",
          distance: f.properties.distance,
          phone:    f.properties.contact?.phone,
          lat:      f.geometry.coordinates[1],
          lon:      f.geometry.coordinates[0],
        }))
        .filter((d: NearbyDoctor) => d.name && d.address);

      setDoctors(results);
    } catch (err) {
      console.error("Could not fetch nearby doctors:", err);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsLoading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${ML_SERVER}/predict/skin`, { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Prediction failed"); }
      const data: Prediction = await res.json();
      setResult(data);
      // Auto fetch nearby doctors
      if (data.severity !== "none") fetchNearbyDoctors(data.prediction);
    } catch (err: any) {
      setError(err.message || "Could not connect to ML server on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => { setImage(null); setFile(null); setResult(null); setError(null); setDoctors([]); };
  const getDirections = (doc: NearbyDoctor) =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${doc.lat},${doc.lon}`, "_blank");

  const severity     = result ? severityConfig[result.severity] : null;
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
            This tool is for informational purposes only. Always consult a qualified dermatologist.
          </p>
        </div>

        {/* Detectable conditions */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detectable Conditions</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(skinConditionEmoji).filter(([k]) => k !== "Uncertain").map(([condition, emoji]) => (
              <span key={condition} className="text-xs bg-muted px-3 py-1.5 rounded-full text-foreground font-medium">
                {emoji} {condition}
              </span>
            ))}
          </div>
        </div>

        {/* Upload */}
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
            <p className="text-sm text-muted-foreground mb-4">Take a clear photo of the affected skin area</p>
            <div className="flex gap-2 justify-center">
              {["JPG", "PNG", "WEBP"].map(f => (
                <span key={f} className="bg-muted px-2 py-1 rounded-full text-xs text-muted-foreground">{f}</span>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden border border-border bg-card">
              <img src={image} alt="Skin" className="w-full object-cover max-h-80" />
              <button onClick={handleReset}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur rounded-xl px-3 py-1.5 text-xs font-medium border border-border">
                {file?.name}
              </div>
            </div>
            {!result && (
              <Button onClick={handleAnalyze} disabled={isLoading}
                className="w-full h-12 text-base font-semibold bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-500/20 rounded-2xl">
                {isLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                  : <><Microscope className="w-4 h-4 mr-2" />Analyze Skin</>}
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
                <div className="text-4xl">{skinConditionEmoji[result.prediction] || "🩺"}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-xl">{result.prediction}</h3>
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", severity.bg, severity.color, severity.border)}>
                      {severity.label}
                    </span>
                  </div>
                  <p className={cn("text-sm font-medium", severity.color)}>{result.confidence.toFixed(1)}% confidence</p>
                </div>
              </div>
              <div className="h-2 bg-background/50 rounded-full overflow-hidden mb-4">
                <div className={cn("h-full rounded-full transition-all duration-1000",
                  result.severity === "none" ? "bg-green-500" :
                  result.severity === "low" ? "bg-yellow-500" :
                  result.severity === "moderate" ? "bg-orange-500" : "bg-red-500"
                )} style={{ width: `${result.confidence}%` }} />
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{result.description}</p>
            </div>

            {/* Recommendation */}
            <div className="bg-card border border-border rounded-3xl p-5">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Microscope className="w-4 h-4 text-pink-500" /> Recommendation
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.recommendation}</p>
            </div>

            {/* Top predictions */}
            <div className="bg-card border border-border rounded-3xl p-5">
              <h4 className="font-semibold text-foreground mb-3">Top Predictions</h4>
              <div className="space-y-3">
                {result.all_predictions.map((p, i) => (
                  <div key={p.label}>
                    <div className="flex justify-between mb-1">
                      <span className={cn("text-sm font-medium flex items-center gap-1.5", i === 0 ? "text-foreground" : "text-muted-foreground")}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {skinConditionEmoji[p.label]} {p.label}
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

            {/* High risk alert */}
            {result.severity === "high" && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  High risk condition detected. Please consult a dermatologist immediately.
                </p>
              </div>
            )}

            {/* ── Nearby Dermatologists ── */}
            {result.severity !== "none" && (
              <div className="bg-card border border-border rounded-3xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-pink-500" />
                    Nearby Specialists for {result.prediction}
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/find-doctor")}
                    className="text-xs text-pink-500 gap-1 h-7">
                    View all <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>

                {doctorsLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                    Finding specialists near you...
                  </div>
                )}

                {!doctorsLoading && doctors.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">Enable location to see nearby specialists</p>
                    <Button size="sm" onClick={() => fetchNearbyDoctors(result.prediction)}
                      className="bg-pink-500 hover:bg-pink-600 text-white gap-2 rounded-xl">
                      <MapPin className="w-3.5 h-3.5" /> Find Specialists Near Me
                    </Button>
                  </div>
                )}

                {!doctorsLoading && doctors.length > 0 && (
                  <div className="space-y-3">
                    {doctors.map(doc => (
                      <div key={doc.place_id}
                        className="flex items-start gap-3 p-3 bg-muted/40 rounded-2xl hover:bg-muted/60 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                          <Microscope className="w-4 h-4 text-pink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{doc.address}</p>
                          {doc.distance && (
                            <p className="text-xs text-pink-500 mt-0.5">🚶 {(doc.distance / 1000).toFixed(1)}km away</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <Button size="sm" onClick={() => getDirections(doc)}
                            className="h-7 text-xs px-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg gap-1">
                            <Navigation className="w-3 h-3" /> Go
                          </Button>
                          {doc.phone && (
                            <Button size="sm" variant="outline" onClick={() => window.open(`tel:${doc.phone}`)}
                              className="h-7 text-xs px-2.5 rounded-lg gap-1">
                              <Phone className="w-3 h-3" /> Call
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <NearbyDoctorsPanel
  disease={result.prediction}
  severity={result.severity}
  category="healthcare.clinic_or_praxis,healthcare.hospital"
  accentColor="pink-500"
/>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1 rounded-2xl gap-2">
                <RefreshCw className="w-4 h-4" /> Analyze Another
              </Button>
              <Button onClick={() => navigate("/find-doctor")}
                className="flex-1 rounded-2xl gap-2 bg-pink-500 hover:bg-pink-600 text-white">
                <MapPin className="w-4 h-4" /> Find Specialist
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}