# Voice Agent Integration for WarpOS

The voice agent has been successfully integrated into WarpOS! This allows users to interact with the operating system using voice commands with real-time speech-to-text and text-to-speech capabilities.

## Features

- 🎤 **Real-time Voice Input** - Continuous listening with Voice Activity Detection (VAD)
- 🔊 **Natural Speech Output** - ElevenLabs TTS for natural-sounding responses
- 💬 **Conversational AI** - Powered by OpenAI GPT-4
- 🎯 **LiveKit Integration** - Low-latency real-time audio streaming
- 📱 **Floating UI** - Beautiful glassmorphic floating voice button on desktop

## Setup Instructions

### 1. Environment Variables

Copy the example environment file and fill in your API credentials:

```bash
cd OS.js
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
# LiveKit Configuration
# Sign up at https://cloud.livekit.io/ for free credits
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# OpenAI API Key
# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key

# ElevenLabs API Key
# Get from https://elevenlabs.io/ (free tier available)
ELEVENLABS_API_KEY=your-elevenlabs-key
```

### 2. Get Your API Keys

#### LiveKit
1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Sign up for a free account (includes free credits)
3. Create a new project
4. Copy your `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`

#### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up and add billing
3. Create an API key at [API Keys](https://platform.openai.com/api-keys)
4. Copy your key (starts with `sk-`)

#### ElevenLabs
1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign up for a free account
3. Go to Profile Settings → API Keys
4. Copy your API key

### 3. Build the Project

```bash
cd OS.js
npm run build
```

### 4. Start the Server

```bash
npm run serve
```

The server will start on `http://localhost:8000` by default.

## Using the Voice Agent

### Desktop Interface

1. **Voice Button**: A blue floating button appears in the bottom-right corner of the desktop
2. **Status Indicator**:
   - Gray: Not connected
   - Green: Connected and listening
   - Orange: Processing your speech
   - Red: Speaking response

### How to Use

1. Click the floating voice button to connect
2. Grant microphone permissions when prompted
3. Start speaking naturally - the system uses Voice Activity Detection
4. The AI will respond in real-time with voice output
5. Your conversation history appears in the transcript panel
6. Click the voice button again to disconnect

### Voice Commands

The voice agent is integrated with WarpOS and can help with:
- Answering questions
- Providing information
- General conversation
- Future: Opening applications, managing files, etc.

## Architecture

### Client-Side (`voice-agent.js`)
- Manages LiveKit connection and audio streaming
- Implements Voice Activity Detection (VAD)
- Handles speech-to-text via OpenAI Whisper
- Manages text-to-speech via ElevenLabs
- Provides UI components (floating button, transcript panel)

### Server-Side (`server/index.js`)
- Generates LiveKit access tokens for secure connections
- Proxies API keys to the client
- Serves LiveKit client library

### Files Modified/Created

**New Files:**
- `OS.js/src/client/voice-agent.js` - Voice agent service
- `OS.js/.env.example` - Environment variables template
- `OS.js/dist/livekit-client.umd.js` - LiveKit client library

**Modified Files:**
- `OS.js/src/client/index.js` - Registered voice agent service
- `OS.js/src/client/index.scss` - Added voice agent UI styles
- `OS.js/src/server/index.js` - Added voice agent endpoints
- `OS.js/package.json` - Added LiveKit dependencies

## Customization

### Adjust Voice Activity Detection

Edit `OS.js/src/client/voice-agent.js`:

```javascript
// VAD settings
this.silenceThreshold = -35;      // dB (higher = less sensitive)
this.silenceDuration = 800;       // ms of silence before stopping
this.minSpeechDuration = 300;     // ms minimum speech to process
this.maxRecordingDuration = 10000; // ms maximum recording
```

### Change Voice or Model

In `voice-agent.js`, modify the `speak()` method:

```javascript
// Change ElevenLabs voice
const voiceId = 'UgBBYS2sOqTuMpoF3BR0'; // Use different voice ID

// Change GPT model
model: 'gpt-4' // or 'gpt-3.5-turbo' for faster/cheaper
```

### UI Position

Edit `OS.js/src/client/index.scss`:

```scss
.warp-voice-button {
  bottom: 90px;  // Adjust vertical position
  right: 24px;   // Adjust horizontal position
}
```

## Troubleshooting

### Microphone Not Working
- Ensure you've granted microphone permissions
- Check browser console for errors
- Verify HTTPS or localhost (required for mic access)

### Connection Failed
- Verify LiveKit credentials in `.env`
- Check that LiveKit URL includes `wss://`
- Ensure server is running (`npm run serve`)

### No Voice Output
- Check ElevenLabs API key
- Verify you have available quota
- Check browser audio is not muted

### Poor Voice Recognition
- Speak clearly and avoid background noise
- Adjust `silenceThreshold` in `voice-agent.js`
- Ensure good microphone quality

## Future Enhancements

Potential improvements:
- [ ] System commands (open apps, manage files)
- [ ] Multi-language support
- [ ] Custom wake word
- [ ] Voice command shortcuts
- [ ] Integration with OS.js applications
- [ ] Conversation memory/history persistence

## Security Notes

⚠️ **Important**: The current implementation exposes API keys to the client for demo purposes. For production:

1. Proxy all API calls through your server
2. Never send API keys to the client
3. Implement rate limiting
4. Add authentication
5. Use environment-specific configs

## Credits

Built with:
- [LiveKit](https://livekit.io/) - Real-time audio infrastructure
- [OpenAI Whisper](https://openai.com/research/whisper) - Speech-to-text
- [OpenAI GPT-4](https://openai.com/gpt-4) - Conversational AI
- [ElevenLabs](https://elevenlabs.io/) - Text-to-speech
- [OS.js](https://www.os-js.org/) - Web desktop platform

---

**Happy voice chatting! 🎤✨**
