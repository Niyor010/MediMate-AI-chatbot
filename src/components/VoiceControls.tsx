import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  Play, 
  Pause,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking: boolean;
  volume: number;
  onToggleListening: () => void;
  onToggleSpeaking: () => void;
  onVolumeChange: (volume: number) => void;
  onRegenerate?: () => void;
  onTranscript?: (transcript: string) => void;
  onSpeak?: (text: string) => void;
  language?: string;
}

export function VoiceControls({
  isListening,
  isSpeaking,
  volume,
  onToggleListening,
  onToggleSpeaking,
  onVolumeChange,
  onRegenerate,
  onTranscript,
  onSpeak,
  language = "en-US"
}: VoiceControlsProps) {
  const [selectedVoice, setSelectedVoice] = useState("en-US-Wavenet-D");
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [pitch, setPitch] = useState(0.0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  // Initialize speech hook
  const {
    isListening: speechIsListening,
    isSpeaking: speechIsSpeaking,
    isSupported,
    isMicrophoneAvailable,
    currentTranscript,
    error,
    availableVoices,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
    clearError
  } = useSpeech({
    onTranscript: (transcript, isFinal) => {
      if (isFinal && onTranscript) {
        onTranscript(transcript);
        clearTranscript();
      }
    },
    onError: (error) => {
      toast({
        title: t('chat.speechError'),
        description: error.message,
        variant: "destructive"
      });
    },
    speechConfig: {
      languageCode: language,
      continuous: true,
      interimResults: true,
      maxAlternatives: 1
    },
    ttsConfig: {
      languageCode: language,
      voiceName: selectedVoice,
      rate: speakingRate,
      pitch: pitch,
      volume: volume / 100
    }
  });

  // Handle speech recognition toggle
  const handleToggleListening = () => {
    if (speechIsListening) {
      stopListening();
      onToggleListening();
    } else {
      if (!isSupported) {
        toast({
          title: t('chat.speechNotSupported'),
          description: t('chat.speechNotSupported'),
          variant: "destructive"
        });
        return;
      }
      if (!isMicrophoneAvailable) {
        toast({
          title: t('chat.microphoneRequired'),
          description: t('chat.microphoneRequired'),
          variant: "destructive"
        });
        return;
      }
      startListening();
      onToggleListening();
    }
  };

  // Handle text-to-speech
  const handleSpeak = async (text: string) => {
    if (speechIsSpeaking) {
      stopSpeaking();
      onToggleSpeaking();
    } else {
      try {
        await speak(text, volume / 100);
        onToggleSpeaking();
        if (onSpeak) onSpeak(text);
      } catch (error) {
        toast({
          title: t('chat.ttsError'),
          description: t('chat.ttsError'),
          variant: "destructive"
        });
      }
    }
  };

  // Clear error when component unmounts or error changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  // Browser voices (filtered and organized)
  const browserVoices = availableVoices
    .filter(voice => voice.lang.startsWith(language.split('-')[0]))
    .map(voice => ({
      id: voice.name,
      name: voice.name,
      description: `${voice.name} (${voice.lang})`,
      voice: voice
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Fallback voices if none available
  const fallbackVoices = [
    { id: "default", name: "Default", description: "System default voice" },
    { id: "female", name: "Female", description: "Female voice" },
    { id: "male", name: "Male", description: "Male voice" }
  ];

  const voices = browserVoices.length > 0 ? browserVoices : fallbackVoices;

  return (
    <div className="flex items-center gap-2">
      {/* Microphone Button */}
      <Button
        variant={speechIsListening ? "default" : "ghost"}
        size="icon"
        onClick={handleToggleListening}
        disabled={!isSupported || !isMicrophoneAvailable}
        className={speechIsListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : ""}
        title={!isSupported ? t('chat.speechNotSupported') : !isMicrophoneAvailable ? t('chat.microphoneRequired') : speechIsListening ? t('chat.voiceInputStopped') : t('chat.voiceInputStarted')}
      >
        {speechIsListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>

      {/* Current transcript display */}
      {currentTranscript && (
        <div className="text-xs text-muted-foreground max-w-32 truncate">
          {currentTranscript}
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <Button
          variant="ghost"
          size="icon"
          onClick={clearError}
          className="text-destructive"
          title={error.message}
        >
          <AlertCircle className="h-4 w-4" />
        </Button>
      )}

      {/* Voice Settings */}
      <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 bg-popover border-border" align="end">
          <DropdownMenuLabel>{t('chat.voiceSettings')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="p-3 space-y-4">
            <div>
              <label className="text-sm font-medium">Voice</label>
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                {voices.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      selectedVoice === voice.id 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="font-medium">{voice.name}</div>
                    <div className="text-xs opacity-75">{voice.description}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">{t('chat.speakingRate')}</label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">0.5x</span>
                <Slider
                  value={[speakingRate]}
                  min={0.5}
                  max={2}
                  step={0.1}
                  onValueChange={(value) => setSpeakingRate(value[0])}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">2x</span>
              </div>
              <div className="text-xs text-center text-muted-foreground mt-1">
                {speakingRate.toFixed(1)}x
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">{t('chat.pitch')}</label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">-20</span>
                <Slider
                  value={[pitch]}
                  min={-20}
                  max={20}
                  step={1}
                  onValueChange={(value) => setPitch(value[0])}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">20</span>
              </div>
              <div className="text-xs text-center text-muted-foreground mt-1">
                {pitch > 0 ? `+${pitch}` : pitch}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">{t('chat.volume')}</label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">0%</span>
                <Slider
                  value={[volume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => onVolumeChange(value[0])}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">100%</span>
              </div>
              <div className="text-xs text-center text-muted-foreground mt-1">
                {volume}%
              </div>
            </div>

            {/* Test voice button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSpeak("Hello! This is a test of the text-to-speech functionality.")}
              disabled={speechIsSpeaking}
              className="w-full"
            >
              {speechIsSpeaking ? (
                <>
                  <Pause className="h-3 w-3 mr-2" />
                  {t('chat.speaking')}
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-2" />
                  {t('chat.testVoice')}
                </>
              )}
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Speaker/Volume Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onSpeak && handleSpeak("")}
        className={speechIsSpeaking ? "text-primary" : ""}
        title={speechIsSpeaking ? t('chat.voiceInputStopped') : t('chat.readAloud')}
      >
        {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>

      {/* Regenerate Voice */}
      {onRegenerate && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRegenerate}
          className="text-muted-foreground hover:text-foreground"
          title={t('chat.regeneratingResponse')}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}