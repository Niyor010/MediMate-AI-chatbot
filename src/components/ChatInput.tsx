import {
  useState,
  useRef,
  KeyboardEvent,
  ClipboardEvent,
} from "react";
import { useSpeech } from "@/hooks/useSpeech";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send, Mic, Paperclip, Image as ImageIcon, X, Loader2,
  CheckCircle2, AlertTriangle, AlertCircle, Stethoscope, Microscope, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ML_SERVER = "http://localhost:8000";

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

type AnalysisType = "oral" | "skin" | "eye";

const severityConfig = {
  none:     { color: "text-green-500",  bg: "bg-green-500/10",  border: "border-green-500/20",  icon: CheckCircle2,  label: "Healthy"       },
  low:      { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: AlertCircle,   label: "Low Risk"      },
  moderate: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: AlertTriangle, label: "Moderate Risk" },
  high:     { color: "text-red-500",    bg: "bg-red-500/10",    border: "border-red-500/20",    icon: AlertTriangle, label: "High Risk"     },
  unknown:  { color: "text-muted-foreground", bg: "bg-muted/50", border: "border-border",       icon: AlertCircle,   label: "Unknown"       },
};

const typeConfig = {
  oral: { label: "Oral / Dental", emoji: "🦷", icon: Stethoscope, color: "text-primary",    hover: "hover:bg-primary/10 hover:border-primary/40",    endpoint: "/predict/oral", chatEmoji: "🦷", chatLabel: "Oral Disease Analysis"  },
  skin: { label: "Skin / Derma",  emoji: "🩺", icon: Microscope,  color: "text-pink-500",   hover: "hover:bg-pink-500/10 hover:border-pink-500/40",   endpoint: "/predict/skin", chatEmoji: "🩺", chatLabel: "Skin Disease Analysis"  },
  eye:  { label: "Eye / Vision",  emoji: "👁️", icon: Eye,         color: "text-cyan-500",   hover: "hover:bg-cyan-500/10 hover:border-cyan-500/40",   endpoint: "/predict/eye",  chatEmoji: "👁️", chatLabel: "Eye Disease Analysis"   },
};

export function ChatInput({
  onSendMessage,
  isLoading = false,
  placeholder = "Ask MediMate anything about your health…",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [attachments, setAttachments] = useState<
    { id: string; name: string; type: string; dataUrl: string }[]
  >([]);
  const [interimTranscript, setInterimTranscript] = useState("");

  // ── Analysis state ──────────────────────────────────────────────────────────
  const [pendingFile, setPendingFile]         = useState<File | null>(null);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [analysisType, setAnalysisType]       = useState<AnalysisType | null>(null);
  const [analysisImage, setAnalysisImage]     = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult]   = useState<Prediction | null>(null);
  const [analysisError, setAnalysisError]     = useState<string | null>(null);
  const [showPanel, setShowPanel]             = useState(false);

  const { isListening: speechIsListening, startListening, stopListening } = useSpeech({
    onTranscript: (transcript, isFinal) => {
      if (isFinal) {
        setMessage((prev) => (prev ? prev + "\n" + transcript : transcript));
        adjustTextareaHeight();
        setInterimTranscript("");
      } else {
        setInterimTranscript(transcript);
      }
    },
    onError: () => {},
  });

  const handleSend = () => {
    if (!isLoading) {
      try { if (speechIsListening) stopListening(); } catch (e) {}
      const parts: string[] = [];
      if (message.trim()) parts.push(message.trim());
      for (const a of attachments) {
        if (a.type.startsWith("image/")) parts.push(`![${a.name}](${a.dataUrl})`);
        else parts.push(a.name);
      }
      const composed = parts.join("\n\n");
      if (composed.trim()) {
        onSendMessage(composed.trim());
        setMessage("");
        setAttachments([]);
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
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleDropFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(f);
        setAttachments((prev) => [...prev, { id: `${Date.now()}-${i}`, name: f.name, type: f.type, dataUrl }]);
      } catch (e) {
        setAttachments((prev) => [...prev, { id: `${Date.now()}-${i}`, name: f.name, type: f.type || "file", dataUrl: "" }]);
      }
    }
    adjustTextareaHeight();
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const dt = e.dataTransfer;
    const text = dt.getData("text");
    if (text) { setMessage((prev) => (prev ? prev + "\n" + text : text)); adjustTextareaHeight(); }
    if (dt.files && dt.files.length > 0) handleDropFiles(dt.files);
  };

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;
    let handled = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          handled = true; e.preventDefault();
          try {
            const dataUrl = await readFileAsDataUrl(file);
            setAttachments((prev) => [...prev, { id: `${Date.now()}-p-${i}`, name: file.name || "pasted-image", type: file.type, dataUrl }]);
          } catch (err) {
            setAttachments((prev) => [...prev, { id: `${Date.now()}-p-${i}`, name: file.name || "pasted-file", type: file.type || "file", dataUrl: "" }]);
          }
        }
      }
    }
    if (!handled) {
      const text = e.clipboardData?.getData("text/plain") || "";
      if (text.startsWith("data:") && text.includes("image")) {
        e.preventDefault();
        setAttachments((prev) => [...prev, { id: `${Date.now()}-p-t`, name: "pasted-image", type: "image", dataUrl: text }]);
      }
    }
  };

  // ── Image icon clicked ─────────────────────────────────────────────────────
  const handleImageIconClick = () => imageInputRef.current?.click();

  // ── File selected → show type selector ────────────────────────────────────
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setAnalysisError("Please select an image file."); return; }
    setPendingFile(f);
    setAnalysisResult(null);
    setAnalysisError(null);
    setShowTypeSelector(true);
    setShowPanel(true);
    setAnalysisType(null);
    const reader = new FileReader();
    reader.onload = (ev) => setAnalysisImage(ev.target?.result as string);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  // ── User picks type → run analysis ────────────────────────────────────────
  const handleTypeSelect = async (type: AnalysisType) => {
    if (!pendingFile) return;
    setAnalysisType(type);
    setShowTypeSelector(false);
    await analyzeImage(pendingFile, type);
  };

  const analyzeImage = async (f: File, type: AnalysisType) => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch(`${ML_SERVER}${typeConfig[type].endpoint}`, { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Prediction failed"); }
      const data: Prediction = await res.json();
      setAnalysisResult(data);
      const sev = severityConfig[data.severity];
      const cfg = typeConfig[type];
      onSendMessage(
        `${cfg.chatEmoji} **${cfg.chatLabel} Result**\n\n` +
        `**Detected:** ${data.prediction} (${data.confidence.toFixed(1)}% confidence)\n` +
        `**Severity:** ${sev.label}\n\n` +
        `**Description:** ${data.description}\n\n` +
        `**Recommendation:** ${data.recommendation}`
      );
    } catch (err: any) {
      setAnalysisError(err.message || "Could not connect to ML server on port 8000.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const closePanel = () => {
    setShowPanel(false); setShowTypeSelector(false);
    setAnalysisImage(null); setPendingFile(null);
    setAnalysisResult(null); setAnalysisError(null); setAnalysisType(null);
  };

  const activeCfg = analysisType ? typeConfig[analysisType] : null;

  return (
    <div className="border rounded-2xl p-3 bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--card-foreground))]">

      {/* ── Analysis Panel ── */}
      {showPanel && (
        <div className="px-3 pt-3 pb-2">
          <div className="bg-background border border-border rounded-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                {activeCfg
                  ? <activeCfg.icon className={cn("w-4 h-4", activeCfg.color)} />
                  : <ImageIcon className="w-4 h-4 text-primary" />
                }
                <span className="text-sm font-semibold text-foreground">
                  {activeCfg ? activeCfg.chatLabel : "Disease Analysis"}
                </span>
                {analysisLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
              </div>
              <button onClick={closePanel} className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex gap-3 p-4">
              {/* Image preview */}
              {analysisImage && (
                <img src={analysisImage} alt="Analysis" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-border" />
              )}

              <div className="flex-1 min-w-0">

                {/* ── Type selector: Oral / Skin / Eye ── */}
                {showTypeSelector && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">What type of image is this?</p>
                    <div className="flex gap-2">
                      {(Object.keys(typeConfig) as AnalysisType[]).map((type) => {
                        const cfg = typeConfig[type];
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={type}
                            onClick={() => handleTypeSelect(type)}
                            className={cn(
                              "flex-1 flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border border-border bg-muted/40 transition-all text-xs font-medium text-foreground",
                              cfg.hover
                            )}
                          >
                            <Icon className={cn("w-4 h-4", cfg.color)} />
                            <span>{cfg.emoji} {cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Loading */}
                {analysisLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Analyzing your {analysisType} image...
                  </div>
                )}

                {/* Error */}
                {analysisError && (
                  <div className="flex items-start gap-2 text-xs text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {analysisError}
                  </div>
                )}

                {/* Result */}
                {analysisResult && (() => {
                  const sev = severityConfig[analysisResult.severity];
                  const Icon = sev.icon;
                  return (
                    <div className="space-y-2">
                      <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold", sev.bg, sev.border, sev.color)}>
                        <Icon className="w-3.5 h-3.5" />
                        {analysisResult.prediction} — {analysisResult.confidence.toFixed(1)}% · {sev.label}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-700",
                            analysisResult.severity === "none"     ? "bg-green-500"  :
                            analysisResult.severity === "low"      ? "bg-yellow-500" :
                            analysisResult.severity === "moderate" ? "bg-orange-500" : "bg-red-500"
                          )}
                          style={{ width: `${analysisResult.confidence}%` }}
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {analysisResult.all_predictions.slice(0, 3).map((p, i) => (
                          <span key={p.label} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {p.label} {p.confidence.toFixed(0)}%
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">✅ Result sent to chat</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main input area ── */}
      <div className="px-3 pb-3">
        <div
          className="relative flex items-end gap-3 p-4 border border-[hsl(var(--border))] rounded-2xl bg-[hsl(var(--card))/0.5] backdrop-blur-sm focus-within:ring-1 focus-within:ring-[hsl(var(--ring))] transition-smooth"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-[hsl(var(--foreground)/0.06)] backdrop-blur-sm rounded-2xl">
              <div className="text-sm text-[hsl(var(--foreground)/0.8)]">Drop files to attach</div>
            </div>
          )}

          {/* Paperclip */}
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 hover:bg-[hsl(var(--hover-overlay))]">
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Text input */}
          <div className="flex-1 min-h-[24px] max-h-[200px]">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => { setMessage(e.target.value); adjustTextareaHeight(); }}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "flex-1 min-h-[24px] max-h-[200px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-muted-foreground"
              )}
              disabled={isLoading}
            />
            {interimTranscript && (
              <div className="mt-2 text-sm italic text-muted-foreground">{interimTranscript}</div>
            )}
            {attachments.length > 0 && (
              <div className="mt-3 flex gap-2 items-center overflow-x-auto">
                {attachments.map((a) => (
                  <div key={a.id} className="relative w-20 h-14 rounded-md overflow-hidden border border-border bg-card/30 flex-shrink-0">
                    {a.dataUrl
                      ? <img src={a.dataUrl} alt={a.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xs px-1 text-muted-foreground">{a.name}</div>
                    }
                    <Button variant="ghost" size="icon"
                      onClick={() => setAttachments((prev) => prev.filter((p) => p.id !== a.id))}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background/80">✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* 📷 Smart image analysis — Oral / Skin / Eye */}
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            <Button
              variant="ghost" size="icon"
              onClick={handleImageIconClick}
              title="Analyze oral, skin, or eye disease from photo"
              className={cn("h-8 w-8 hover:bg-[hsl(var(--hover-overlay))] relative", showPanel && "bg-primary/10 text-primary")}
            >
              {analysisLoading
                ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                : <ImageIcon className="h-4 w-4" />
              }
              {analysisResult && !analysisLoading && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-green-500" />
              )}
            </Button>

            {/* Mic */}
            <Button
              variant={speechIsListening ? "default" : "ghost"}
              size="icon"
              onClick={() => { if (speechIsListening) stopListening(); else startListening(); }}
              className={cn(
                "h-8 w-8",
                speechIsListening
                  ? "bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.9)] animate-pulse"
                  : "hover:bg-[hsl(var(--hover-overlay))]"
              )}
              title={speechIsListening ? "Stop voice input" : "Start voice input"}
            >
              <Mic className="h-4 w-4" />
            </Button>

            {/* Send */}
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              size="icon"
              className={cn(
                "h-8 w-8 transition-smooth",
                message.trim() && !isLoading
                  ? "bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:opacity-90 hover-glow"
                  : "bg-muted text-muted-foreground"
              )}
            >
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