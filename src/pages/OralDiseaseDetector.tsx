import NearbyDoctorsPanel from "@/components/NearbyDoctorsPanel";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

import {
  ImageIcon, Loader2, CheckCircle2, AlertTriangle,
  AlertCircle, X, ArrowLeft, Stethoscope, RefreshCw,
  MapPin, Navigation, Phone, Star, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ML_SERVER      = "http://localhost:8000";
const GEOAPIFY_KEY   = "8d773395039548c2b4a7b7f3731d8753"; 

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

// Map oral disease → best doctor type to search
const getDoctorKeyword = (disease: string): string => {
  const map: Record<string, string> = {
    "Calculus":            "dentist scaling clinic",
    "Caries":              "dentist cavity treatment",
    "Gingivitis":          "periodontist dentist",
    "Ulcer":               "oral medicine dentist",
    "Tooth Discoloration": "cosmetic dentist whitening",
    "Hypodontia":          "orthodontist dentist implant",
    "Healthy":             "dentist clinic",
    "Uncertain":           "dentist clinic",
  };
  return map[disease] || "dentist clinic";
};

export default function OralDiseaseDetector() {
  const navigate = useNavigate();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [image, setImage]         = useState<string | null>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult]       = useState<Prediction | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Nearby doctors state
  const [doctors, setDoctors]           = useState<NearbyDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);

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

  // ── Fetch nearby doctors based on disease ────────────────────────────────
  const fetchNearbyDoctors = async (disease: string) => {
    setDoctorsLoading(true);
    setDoctors([]);
    try {
      // Get user location
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      );
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setUserLocation({ lat, lon });

      const keyword = getDoctorKeyword(disease);
      const url = `https://api.geoapify.com/v2/places?` +
        `categories=healthcare.dentist,healthcare.clinic_or_praxis` +
        `&filter=circle:${lon},${lat},5000` +
        `&bias=proximity:${lon},${lat}` +
        `&limit=5&apiKey=${GEOAPIFY_KEY}`;

      const res  = await fetch(url);
      const data = await res.json();

      const results: NearbyDoctor[] = (data.features || [])
        .map((f: any) => ({
          place_id: f.properties.place_id || Math.random().toString(),
          name:     f.properties.name || "Dental Clinic",
          address:  f.properties.formatted || "",
          distance: f.properties.distance,
          phone:    f.properties.contact?.phone,
          lat:      f.geometry.coordinates[1],
          lon:      f.geometry.coordinates[0],
        }))
        .filter((d: NearbyDoctor) => d.name !== "Dental Clinic" || d.address);

      setDoctors(results);
    } catch (err) {
      console.error("Could not fetch nearby doctors:", err);
    } finally {
      setDoctorsLoading(false);
    }
  };

  // ── Analyze image ─────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!file) return;
    setIsLoading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${ML_SERVER}/predict/oral`, { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Prediction failed"); }
      const data: Prediction = await res.json();
      setResult(data);
      // Auto fetch nearby doctors after result
      if (data.severity !== "none") {
        fetchNearbyDoctors(data.prediction);
      }
    } catch (err: any) {
      setError(err.message || "Could not connect to ML server on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => { setImage(null); setFile(null); setResult(null); setError(null); setDoctors([]); };
  const getDirections = (doc: NearbyDoctor) =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${doc.lat},${doc.lon}`, "_blank");

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

        {/* Disclaimer */}
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-600 dark:text-yellow-400 leading-relaxed">
            This tool is for informational purposes only. Always consult a qualified dentist.
          </p>
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
              isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Upload Oral Image</h3>
            <p className="text-sm text-muted-foreground mb-4">Drag & drop or click to upload a photo of your teeth</p>
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
              <img src={image} alt="Uploaded" className="w-full object-cover max-h-80" />
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
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-2xl">
                {isLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                  : <><Stethoscope className="w-4 h-4 mr-2" />Analyze Image</>}
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
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", severity.bg)}>
                  <SeverityIcon className={cn("w-5 h-5", severity.color)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-lg">{result.prediction}</h3>
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
                <Stethoscope className="w-4 h-4 text-primary" /> Recommendation
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
                      <span className={cn("text-sm font-medium", i === 0 ? "text-foreground" : "text-muted-foreground")}>
                        {i === 0 ? "🥇 " : i === 1 ? "🥈 " : "🥉 "}{p.label}
                      </span>
                      <span className="text-sm font-semibold">{p.confidence.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", i === 0 ? "bg-primary" : "bg-muted-foreground/30")}
                        style={{ width: `${p.confidence}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {result && result.severity !== "none" && (
  <NearbyDoctorsPanel
    disease={result.prediction}
    severity={result.severity}
    category="healthcare.dentist,healthcare.clinic_or_praxis"
    accentColor="primary"
  />
)}

            {/* ── Nearby Dentists ── */}
            {result.severity !== "none" && (
              <div className="bg-card border border-border rounded-3xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Nearby Dentists for {result.prediction}
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/find-doctor")}
                    className="text-xs text-primary gap-1 h-7">
                    View all <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>

                {doctorsLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Finding dentists near you...
                  </div>
                )}

                {!doctorsLoading && doctors.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">Enable location to see nearby dentists</p>
                    <Button size="sm" onClick={() => fetchNearbyDoctors(result.prediction)}
                      className="bg-primary hover:bg-primary/90 gap-2 rounded-xl">
                      <MapPin className="w-3.5 h-3.5" /> Find Dentists Near Me
                    </Button>
                  </div>
                )}

                {!doctorsLoading && doctors.length > 0 && (
                  <div className="space-y-3">
                    {doctors.map(doc => (
                      <div key={doc.place_id}
                        className="flex items-start gap-3 p-3 bg-muted/40 rounded-2xl hover:bg-muted/60 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Stethoscope className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{doc.address}</p>
                          {doc.distance && (
                            <p className="text-xs text-primary mt-0.5">
                              🚶 {(doc.distance / 1000).toFixed(1)}km away
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <Button size="sm" onClick={() => getDirections(doc)}
                            className="h-7 text-xs px-2.5 bg-primary hover:bg-primary/90 rounded-lg gap-1">
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
  category="healthcare.dentist,healthcare.clinic_or_praxis"
  accentColor="primary"
/>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleReset} className="flex-1 rounded-2xl gap-2">
                <RefreshCw className="w-4 h-4" /> Analyze Another
              </Button>
              <Button onClick={() => navigate("/find-doctor")}
                className="flex-1 rounded-2xl gap-2 bg-primary hover:bg-primary/90">
                <MapPin className="w-4 h-4" /> Find Dentist
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}