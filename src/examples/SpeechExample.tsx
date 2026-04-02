import React, { useState } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

/**
 * Example component demonstrating how to use the speech functionality
 * This shows the basic usage of the useSpeech hook
 */
export function SpeechExample() {
  const [transcript, setTranscript] = useState('');
  const [textToSpeak, setTextToSpeak] = useState('Hello! This is a test of the text-to-speech functionality.');

  const {
    isListening,
    isSpeaking,
    isSupported,
    isMicrophoneAvailable,
    currentTranscript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearTranscript,
    clearError
  } = useSpeech({
    onTranscript: (transcript, isFinal) => {
      if (isFinal) {
        setTranscript(transcript);
        clearTranscript();
      }
    },
    onError: (error) => {
      console.error('Speech error:', error);
    },
    speechConfig: {
      languageCode: 'en-US',
      sampleRateHertz: 16000,
      encoding: 'LINEAR16'
    },
    ttsConfig: {
      languageCode: 'en-US',
      voiceName: 'en-US-Wavenet-D',
      ssmlGender: 'FEMALE',
      speakingRate: 1.0,
      pitch: 0.0,
      volumeGainDb: 0.0
    }
  });

  const handleStartListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      try {
        await speak(textToSpeak, 0.8);
      } catch (error) {
        console.error('TTS error:', error);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Speech Recognition & Text-to-Speech Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Speech Recognition */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Speech-to-Text</h3>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleStartListening}
                disabled={!isSupported || !isMicrophoneAvailable}
                variant={isListening ? "destructive" : "default"}
              >
                {isListening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </Button>
              {error && (
                <Button variant="outline" onClick={clearError}>
                  Clear Error
                </Button>
              )}
            </div>
            
            {currentTranscript && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Current transcript:</p>
                <p className="font-medium">{currentTranscript}</p>
              </div>
            )}
            
            {transcript && (
              <div className="p-3 bg-primary/10 rounded-md">
                <p className="text-sm text-muted-foreground">Final transcript:</p>
                <p className="font-medium">{transcript}</p>
              </div>
            )}
            
            {!isSupported && (
              <p className="text-sm text-destructive">
                Speech recognition is not supported in this browser.
              </p>
            )}
            
            {!isMicrophoneAvailable && (
              <p className="text-sm text-destructive">
                Microphone access is required for speech recognition.
              </p>
            )}
          </div>

          {/* Text-to-Speech */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Text-to-Speech</h3>
            <div className="space-y-2">
              <textarea
                value={textToSpeak}
                onChange={(e) => setTextToSpeak(e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Enter text to speak..."
              />
              <Button
                onClick={handleSpeak}
                variant={isSpeaking ? "destructive" : "default"}
              >
                {isSpeaking ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
                {isSpeaking ? 'Stop Speaking' : 'Speak Text'}
              </Button>
            </div>
          </div>

          {/* Status Information */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Status</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Speech Recognition:</span>{' '}
                <span className={isSupported ? 'text-green-600' : 'text-red-600'}>
                  {isSupported ? 'Supported' : 'Not Supported'}
                </span>
              </div>
              <div>
                <span className="font-medium">Microphone:</span>{' '}
                <span className={isMicrophoneAvailable ? 'text-green-600' : 'text-red-600'}>
                  {isMicrophoneAvailable ? 'Available' : 'Not Available'}
                </span>
              </div>
              <div>
                <span className="font-medium">Listening:</span>{' '}
                <span className={isListening ? 'text-blue-600' : 'text-gray-600'}>
                  {isListening ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="font-medium">Speaking:</span>{' '}
                <span className={isSpeaking ? 'text-blue-600' : 'text-gray-600'}>
                  {isSpeaking ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
