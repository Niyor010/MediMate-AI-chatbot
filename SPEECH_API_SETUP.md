# Web Speech API Setup Guide

This guide explains how to use the built-in Web Speech API for speech-to-text and text-to-speech functionality in your chatbot.

## Prerequisites

1. A modern web browser (Chrome, Firefox, Safari, Edge)
2. Microphone access permissions
3. HTTPS connection (required for microphone access)

## No Setup Required!

The Web Speech API is built into modern browsers, so no additional setup or API keys are needed. The functionality works out of the box!

## Browser Compatibility

### Speech Recognition (Speech-to-Text)
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 14.5+)
- **Edge**: Full support

### Speech Synthesis (Text-to-Speech)
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

## Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to the application
3. Click the microphone button to test speech-to-text
4. Click the speaker button to test text-to-speech
5. Use the voice settings to customize voice parameters

## Features

### Speech-to-Text
- Real-time speech recognition using Web Speech API
- Multiple language support
- Continuous listening mode
- Interim results display
- Microphone access handling

### Text-to-Speech
- Multiple voice options (browser-dependent)
- Adjustable speaking rate (0.1x to 10x)
- Pitch control (0 to 2)
- Volume control (0 to 1)
- Language-specific voices

### Voice Controls
- Microphone button for speech input
- Speaker button for text-to-speech
- Voice settings panel with customization options
- Real-time transcript display
- Error handling and user feedback

## Supported Languages

The application supports multiple languages including:
- English (US/UK)
- Spanish (Spain/Mexico)
- French
- German
- Italian
- Portuguese (Brazil)
- Russian
- Japanese
- Korean
- Chinese (Simplified)
- Hindi
- Arabic

## Troubleshooting

### Common Issues

1. **"Speech recognition not supported"**
   - Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
   - Check if the page is served over HTTPS

2. **"Microphone access required"**
   - Grant microphone permissions when prompted
   - Check browser settings for microphone access

3. **"Speech recognition error"**
   - Check your internet connection
   - Try refreshing the page
   - Ensure microphone is working

4. **"Text-to-speech error"**
   - Check if speech synthesis is supported in your browser
   - Try selecting a different voice
   - Check browser audio settings

### Browser-Specific Notes

- **Chrome**: Best support, most voices available
- **Firefox**: Good support, limited voice options
- **Safari**: Good support on desktop, limited on mobile
- **Edge**: Good support, similar to Chrome

## Security Notes

- No API keys or credentials required
- All processing happens locally in the browser
- No data is sent to external servers
- Microphone access is only used for speech recognition

## Cost Considerations

- **Free to use** - No API costs
- No usage limits
- No billing required
- Works offline (after initial page load)

## Additional Resources

- [Web Speech API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Speech Recognition API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Speech Synthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
