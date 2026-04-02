// Web Speech API Configuration
export const speechConfig = {
  // Language codes for speech recognition and text-to-speech
  defaultLanguage: 'en-US',
  
  // Supported languages
  supportedLanguages: [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'es-MX', name: 'Spanish (Mexico)' },
    { code: 'fr-FR', name: 'French' },
    { code: 'de-DE', name: 'German' },
    { code: 'it-IT', name: 'Italian' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'ru-RU', name: 'Russian' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'ar-SA', name: 'Arabic' }
  ],

  // Voice settings
  defaultVoice: 'default',
  defaultSpeakingRate: 1.0,
  defaultPitch: 1.0,
  defaultVolume: 1.0,

  // Speech recognition settings
  recognitionConfig: {
    continuous: true,
    interimResults: true,
    maxAlternatives: 1
  },

  // Text-to-speech settings
  ttsConfig: {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  }
};
