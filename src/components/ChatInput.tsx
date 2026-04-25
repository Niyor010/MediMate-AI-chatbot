import {
  useState, useRef, KeyboardEvent, ClipboardEvent,
} from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send, Mic, Paperclip, Image as ImageIcon, X,
  Loader2, CheckCircle2, AlertTriangle, AlertCircle,
  Stethoscope, MapPin, Navigation, Phone, Microscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ML_SERVER    = "http://localhost:8000";
const GEOAPIFY_KEY   = "8d773395039548c2b4a7b7f3731d8753"; 
// ← paste your Geoapify key here

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

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

type AnalysisType = "oral" | "skin";

export function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = "Ask MediMate anything about your health…",
}: ChatInputProps) {
  const [message, setMessage]                   = useState("");
  const textareaRef                             = useRef<HTMLTextAreaElement>(null);
  const imageInputRef                           = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging]             = useState(false);
  const [attachments, setAttachments]           = useState<{ id: string; name: string; type: string; dataUrl: string }[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");

  // ── Analysis state ────────────────────────────────────────────────────────
  const [showTypeSelector, setShowTypeSelector] = useState(false); // show oral/skin picker
  const [analysisType, setAnalysisType]         = useState<AnalysisType>("oral");
  const [analysisImage, setAnalysisImage]       = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading]   = useState(false);
  const [analysisResult, setAnalysisResult]     = useState<Prediction | null>(null);
  const [analysisError, setAnalysisError]       = useState<string | null>(null);
  const [showPanel, setShowPanel]               = useState(false);

  // ── Nearby doctors state ──────────────────────────────────────────────────
  const [doctors, setDoctors]               = useState<NearbyDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorsError, setDoctorsError]     = useState<string | null>(null);

  const { isListening: speechIsListening, startListening, stopListening } = useSpeech({
    onTranscript: (transcript, isFinal) => {
      if (isFinal) { setMessage(p => p ? p + "\n" + transcript : transcript); adjustTextareaHeight(); setInterimTranscript(""); }
      else setInterimTranscript(transcript);
    },
    onError: () => {},
  });

  const handleSend = () => {
    if (!isLoading) {
      try { if (speechIsListening) stopListening(); } catch {}
      const parts: string[] = [];
      if (message.trim()) parts.push(message.trim());
      for (const a of attachments) {
        if (a.type.startsWith("image/")) parts.push(`![${a.name}](${a.dataUrl})`);
        else parts.push(a.name);
      }
      const composed = parts.join("\n\n");
      if (composed.trim()) {
        onSendMessage(composed.trim());
        setMessage(""); setAttachments([]);
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const handleDropFiles = async (files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const dataUrl = await readFileAsDataUrl(f).catch(() => "");
      setAttachments(p => [...p, { id: `${Date.now()}-${i}`, name: f.name, type: f.type, dataUrl }]);
    }
    adjustTextareaHeight();
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.getData("text")) { setMessage(p => p ? p + "\n" + e.dataTransfer.getData("text") : e.dataTransfer.getData("text")); adjustTextareaHeight(); }
    if (e.dataTransfer.files?.length) handleDropFiles(e.dataTransfer.files);
  };

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const dataUrl = await readFileAsDataUrl(file).catch(() => "");
          setAttachments(p => [...p, { id: `${Date.now()}-p`, name: file.name || "pasted-image", type: file.type, dataUrl }]);
        }
      }
    }
  };

  // ── Fetch nearby doctors ──────────────────────────────────────────────────
  const fetchNearbyDoctors = async (type: AnalysisType, severity: string) => {
    if (severity === "none") return;
    setDoctorsLoading(true);
    setDoctors([]);
    setDoctorsError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
      );
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const category = type === "oral"
        ? "healthcare.dentist,healthcare.clinic_or_praxis"
        : "healthcare.clinic_or_praxis,healthcare.hospital";

      const url = `https://api.geoapify.com/v2/places` +
        `?categories=${encodeURIComponent(category)}` +
        `&filter=circle:${lon},${lat},5000` +
        `&bias=proximity:${lon},${lat}` +
        `&limit=3&apiKey=${GEOAPIFY_KEY}`;

      const res  = await fetch(url);
      const data = await res.json();

      if (data.statusCode === 401) throw new Error("Invalid Geoapify API key");

      const results: NearbyDoctor[] = (data.features || [])
        .map((f: any) => ({
          place_id: f.properties.place_id || `${Math.random()}`,
          name:     f.properties.name || "Clinic",
          address:  f.properties.formatted || "",
          distance: f.properties.distance,
          phone:    f.properties.contact?.phone,
          lat:      f.geometry.coordinates[1],
          lon:      f.geometry.coordinates[0],
        }))
        .filter((d: NearbyDoctor) => d.name && d.address);

      setDoctors(results);
    } catch (err: any) {
      setDoctorsError(err.message || "Could not fetch nearby doctors.");
    } finally {
      setDoctorsLoading(false);
    }
  };

  // ── Step 1: Click image icon → show oral/skin selector ───────────────────
  const handleImageIconClick = () => {
    setShowTypeSelector(true);
    setShowPanel(false);
    setAnalysisResult(null);
    setAnalysisError(null);
    setDoctors([]);
  };

  // ── Step 2: User picks oral or skin → open file picker ───────────────────
  const selectType = (type: AnalysisType) => {
    setAnalysisType(type);
    setShowTypeSelector(false);
    setTimeout(() => imageInputRef.current?.click(), 100);
  };

  // ── Step 3: File selected → analyze + fetch doctors ──────────────────────
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;

    setAnalysisError(null);
    setAnalysisResult(null);
    setShowPanel(true);
    setDoctors([]);

    const reader = new FileReader();
    reader.onload = (ev) => setAnalysisImage(ev.target?.result as string);
    reader.readAsDataURL(f);

    setAnalysisLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const endpoint = analysisType === "oral" ? "predict/oral" : "predict/skin";
      const res  = await fetch(`${ML_SERVER}/${endpoint}`, { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Prediction failed"); }
      const data: Prediction = await res.json();
      setAnalysisResult(data);

      const sev   = severityConfig[data.severity];
      const emoji = analysisType === "oral" ? "🦷" : "🩺";
      const label = analysisType === "oral" ? "Oral Disease Analysis" : "Skin Disease Analysis";
      onSendMessage(
        `${emoji} **${label}**\n\n` +
        `**Detected:** ${data.prediction} (${data.confidence.toFixed(1)}%)\n` +
        `**Severity:** ${sev.label}\n` +
        `**Description:** ${data.description}\n` +
        `**Recommendation:** ${data.recommendation}`
      );

      await fetchNearbyDoctors(analysisType, data.severity);
    } catch (err: any) {
      setAnalysisError(err.message || "Could not connect to ML server on port 8000.");
    } finally {
      setAnalysisLoading(false);
    }
    e.target.value = "";
  };

  const closePanel = () => {
    setShowPanel(false); setShowTypeSelector(false);
    setAnalysisImage(null); setAnalysisResult(null);
    setAnalysisError(null); setDoctors([]); setDoctorsError(null);
  };

  const getDirections = (doc: NearbyDoctor) =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${doc.lat},${doc.lon}`, "_blank");

  const isOral    = analysisType === "oral";
  const accentCls = isOral ? "text-primary" : "text-pink-500";
  const accentBg  = isOral ? "bg-primary/10" : "bg-pink-500/10";
  const accentBtn = isOral ? "bg-primary hover:bg-primary/90" : "bg-pink-500 hover:bg-pink-600";

  return (
    <div className="border rounded-2xl p-3 bg-[hsl(var(--card))] border-[hsl(var(--border))]">

      {/* ── Step 1: Type selector (oral / skin) ── */}
      {showTypeSelector && (
        <div className="px-1 pt-2 pb-3">
          <div className="bg-background border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">What would you like to analyze?</p>
              <button onClick={() => setShowTypeSelector(false)} className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Oral option */}
              <button
                onClick={() => selectType("oral")}
                className="flex flex-col items-center gap-3 p-4 bg-primary/5 border-2 border-primary/20 hover:border-primary/60 hover:bg-primary/10 rounded-2xl transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
                  <Stethoscope className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-foreground">🦷 Oral</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Teeth, gums & mouth</p>
                </div>
              </button>

              {/* Skin option */}
              <button
                onClick={() => selectType("skin")}
                className="flex flex-col items-center gap-3 p-4 bg-pink-500/5 border-2 border-pink-500/20 hover:border-pink-500/60 hover:bg-pink-500/10 rounded-2xl transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20">
                  <Microscope className="w-6 h-6 text-pink-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-sm text-foreground">🩺 Skin</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Rashes, lesions & conditions</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2 & 3: Analysis panel + nearby doctors ── */}
      {showPanel && (
        <div className="px-1 pt-2 pb-3">
          <div className="bg-background border border-border rounded-2xl overflow-hidden">

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                {isOral
                  ? <Stethoscope className="w-4 h-4 text-primary" />
                  : <Microscope className="w-4 h-4 text-pink-500" />
                }
                <span className="text-sm font-semibold text-foreground">
                  {isOral ? "🦷 Oral" : "🩺 Skin"} Disease Analysis
                </span>
                {analysisLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
              </div>
              <button onClick={closePanel} className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Image + result */}
            <div className="flex gap-3 p-4">
              {analysisImage && (
                <img src={analysisImage} alt="Analysis" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-border" />
              )}
              <div className="flex-1 min-w-0">
                {analysisLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Analyzing your image...
                  </div>
                )}
                {analysisError && (
                  <div className="flex items-start gap-2 text-xs text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {analysisError}
                  </div>
                )}
                {analysisResult && (() => {
                  const sev  = severityConfig[analysisResult.severity];
                  const Icon = sev.icon;
                  return (
                    <div className="space-y-2">
                      <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold", sev.bg, sev.border, sev.color)}>
                        <Icon className="w-3.5 h-3.5" />
                        {analysisResult.prediction} — {analysisResult.confidence.toFixed(1)}% · {sev.label}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-700",
                          analysisResult.severity === "none" ? "bg-green-500" :
                          analysisResult.severity === "low"  ? "bg-yellow-500" :
                          analysisResult.severity === "moderate" ? "bg-orange-500" : "bg-red-500"
                        )} style={{ width: `${analysisResult.confidence}%` }} />
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {analysisResult.all_predictions.slice(0, 3).map((p, i) => (
                          <span key={p.label} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {p.label} {p.confidence.toFixed(0)}%
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">✅ Result sent to chat</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Nearby doctors */}
            {analysisResult && analysisResult.severity !== "none" && (
              <div className="border-t border-border px-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className={`w-3.5 h-3.5 ${accentCls}`} />
                  <p className="text-xs font-semibold text-foreground">
                    Nearby {isOral ? "Dentists" : "Dermatologists"}
                  </p>
                  {doctorsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary ml-auto" />}
                </div>

                {doctorsLoading && (
                  <p className="text-xs text-muted-foreground">Finding specialists near you...</p>
                )}

                {!doctorsLoading && doctorsError && (
                  <div className="space-y-2">
                    <p className="text-xs text-destructive">{doctorsError}</p>
                    {doctorsError.includes("API key") && (
                      <p className="text-[10px] text-muted-foreground">
                        Get free key at <a href="https://myprojects.geoapify.com" target="_blank" className="text-primary underline">myprojects.geoapify.com</a> and update GEOAPIFY_KEY in ChatInput.tsx
                      </p>
                    )}
                    <Button size="sm" variant="outline" onClick={() => fetchNearbyDoctors(analysisType, analysisResult.severity)}
                      className="h-6 text-[10px] px-2 rounded-lg">Retry</Button>
                  </div>
                )}

                {!doctorsLoading && !doctorsError && doctors.length === 0 && (
                  <Button size="sm" onClick={() => fetchNearbyDoctors(analysisType, analysisResult.severity)}
                    className={`h-7 text-xs rounded-xl gap-1.5 w-full text-white ${accentBtn}`}>
                    <MapPin className="w-3.5 h-3.5" /> Find {isOral ? "Dentists" : "Dermatologists"} Near Me
                  </Button>
                )}

                {!doctorsLoading && doctors.length > 0 && (
                  <div className="space-y-2">
                    {doctors.map(doc => (
                      <div key={doc.place_id} className="flex items-center gap-2 p-2 bg-muted/40 rounded-xl">
                        <div className={`w-7 h-7 rounded-lg ${accentBg} flex items-center justify-center flex-shrink-0`}>
                          {isOral
                            ? <Stethoscope className={`w-3.5 h-3.5 ${accentCls}`} />
                            : <Microscope  className={`w-3.5 h-3.5 ${accentCls}`} />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{doc.name}</p>
                          {doc.distance !== undefined && (
                            <p className={`text-[10px] ${accentCls}`}>🚶 {(doc.distance / 1000).toFixed(1)}km away</p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button size="sm" onClick={() => getDirections(doc)}
                            className={`h-6 text-[10px] px-2 rounded-lg gap-1 text-white ${accentBtn}`}>
                            <Navigation className="w-3 h-3" /> Go
                          </Button>
                          {doc.phone && (
                            <Button size="sm" variant="outline" onClick={() => window.open(`tel:${doc.phone}`)}
                              className="h-6 text-[10px] px-2 rounded-lg">
                              <Phone className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main text input ── */}
      <div className="px-3 pb-3">
        <div
          className="relative flex items-end gap-3 p-4 border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))/0.5] backdrop-blur-sm focus-within:ring-1 focus-within:ring-[hsl(var(--ring))]"
          onDragEnter={handleDragEnter} onDragOver={handleDragOver}
          onDragLeave={handleDragLeave} onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-foreground/5 backdrop-blur-sm rounded-2xl">
              <p className="text-sm text-foreground/70">Drop files to attach</p>
            </div>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 hover:bg-[hsl(var(--hover-overlay))]">
            <Paperclip className="h-4 w-4" />
          </Button>

          <div className="flex-1 min-h-[24px] max-h-[200px]">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={e => { setMessage(e.target.value); adjustTextareaHeight(); }}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            {interimTranscript && <div className="mt-2 text-sm italic text-muted-foreground">{interimTranscript}</div>}
            {attachments.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {attachments.map(a => (
                  <div key={a.id} className="relative w-20 h-14 rounded-md overflow-hidden border border-border bg-card/30 flex-shrink-0">
                    {a.dataUrl ? <img src={a.dataUrl} alt={a.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs px-1 text-muted-foreground">{a.name}</div>}
                    <Button variant="ghost" size="icon" onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background/80">✕</Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* 📷 Image icon → shows oral/skin selector first */}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            <Button variant="ghost" size="icon" onClick={handleImageIconClick} title="Analyze oral or skin disease"
              className={cn("h-8 w-8 hover:bg-[hsl(var(--hover-overlay))] relative",
                (showPanel || showTypeSelector) && "bg-primary/10 text-primary"
              )}>
              {analysisLoading
                ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                : <ImageIcon className="h-4 w-4" />
              }
              {analysisResult && !analysisLoading && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500" />
              )}
            </Button>

            <Button variant={speechIsListening ? "default" : "ghost"} size="icon"
              onClick={() => { if (speechIsListening) stopListening(); else startListening(); }}
              className={cn("h-8 w-8", speechIsListening
                ? "bg-[hsl(var(--destructive))] animate-pulse"
                : "hover:bg-[hsl(var(--hover-overlay))]"
              )}>
              <Mic className="h-4 w-4" />
            </Button>

            <Button onClick={handleSend} disabled={!message.trim() || isLoading} size="icon"
              className={cn("h-8 w-8", message.trim() && !isLoading
                ? "bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90"
                : "bg-muted text-muted-foreground"
              )}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          MediMate may make mistakes. Always consult a qualified doctor for medical advice.
        </p>
      </div>
    </div>
  );
}