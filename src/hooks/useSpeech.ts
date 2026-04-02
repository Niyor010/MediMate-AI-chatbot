import { useState, useCallback, useRef, useEffect } from 'react';
import { speechService, SpeechConfig, TTSConfig } from '../services/SpeechService';

export interface UseSpeechOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onStop?: () => void;
  speechConfig?: SpeechConfig;
  ttsConfig?: TTSConfig;
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isMicrophoneAvailable, setIsMicrophoneAvailable] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  
  const audioRef = useRef<AudioBuffer | null>(null);
  const isProcessingRef = useRef(false);

  // Check support and availability on mount
  useEffect(() => {
    const checkSupport = async () => {
      setIsSupported(speechService.isSpeechRecognitionSupported());
      const micAvailable = await speechService.isMicrophoneAvailable();
      setIsMicrophoneAvailable(micAvailable);
      
      // Load available voices
      try {
        const voices = speechService.getAvailableVoices();
        setAvailableVoices(voices);
      } catch (err) {
        console.warn('Could not load voices:', err);
      }
    };
    
    checkSupport();
  }, [options.speechConfig?.languageCode]);

  const startListening = useCallback(async () => {
    if (isListening || isProcessingRef.current) return;
    
    if (!isSupported) {
      setError(new Error('Speech recognition is not supported in this browser'));
      return;
    }
    
    if (!isMicrophoneAvailable) {
      setError(new Error('Microphone access is not available'));
      return;
    }

    try {
      isProcessingRef.current = true;
      setError(null);
      setIsListening(true);
      options.onStart?.();

      await speechService.startSpeechToText(
        (transcript, isFinal) => {
          setCurrentTranscript(transcript);
          options.onTranscript?.(transcript, isFinal);
        },
        (error) => {
          setError(error);
          options.onError?.(error);
          setIsListening(false);
          isProcessingRef.current = false;
        },
        options.speechConfig
      );
    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
      setIsListening(false);
      isProcessingRef.current = false;
    }
  }, [isListening, isSupported, isMicrophoneAvailable, options]);

  const stopListening = useCallback(() => {
    if (!isListening) return;
    
    speechService.stopSpeechToText();
    setIsListening(false);
    isProcessingRef.current = false;
    options.onStop?.();
  }, [isListening, options]);

  const speak = useCallback(async (text: string, volume: number = 1.0) => {
    if (isSpeaking) return;
    
    try {
      setIsSpeaking(true);
      setError(null);
      
      await speechService.textToSpeech(text, {
        ...options.ttsConfig,
        volume: volume
      });
    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
    } finally {
      setIsSpeaking(false);
    }
  }, [isSpeaking, options.ttsConfig, options.onError]);

  const stopSpeaking = useCallback(() => {
    speechService.stopTextToSpeech();
    setIsSpeaking(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setCurrentTranscript('');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isListening, stopListening]);

  return {
    // State
    isListening,
    isSpeaking,
    isSupported,
    isMicrophoneAvailable,
    currentTranscript,
    error,
    availableVoices,
    
    // Actions
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
    clearError,
    
    // Utilities
    toggleListening: () => isListening ? stopListening() : startListening(),
  };
}
