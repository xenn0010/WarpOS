# Voice Chat with AI

A real-time voice chat application that lets you talk to an AI assistant using OpenAI's STT (Whisper), GPT-4, and TTS, powered by LiveKit for real-time communication.

## Features

- 🎤 **Voice Input**: Speak naturally to the AI assistant
- 🔊 **Voice Output**: Get responses in natural-sounding speech
- 💬 **Real-time Chat**: See transcriptions of your conversation
- 🎨 **Beautiful UI**: Clean, modern interface with visual feedback

## Prerequisites

- Node.js (v18 or higher)
- OpenAI API key
- LiveKit account and credentials

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Your `.env` file is already configured with:
- `LIVEKIT_URL` - Your LiveKit server URL
- `LIVEKIT_API_KEY` - Your LiveKit API key
- `LIVEKIT_API_SECRET` - Your LiveKit API secret
- `OPENAI_API_KEY` - Your OpenAI API key
- `PORT` - Server port (default: 3000)

### 3. Run the Application

Start the server:

```bash
npm start
```

The server will start on `http://localhost:3000`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Click the **"Connect"** button to join the voice chat room
3. **Hold** the **"Hold to Talk"** button and speak
4. Release the button when you're done speaking
5. The AI will transcribe your speech, generate a response, and speak it back to you
6. Your conversation history will appear below the controls

## How It Works

### Architecture

1. **Server** (`server.js`):
   - Express server that serves the web interface
   - Generates LiveKit access tokens for clients
   - Provides OpenAI API key to client (for demo purposes)

2. **Client** (`public/index.html` + `public/app.js`):
   - Connects to LiveKit room for real-time audio
   - Records audio when user holds the button
   - Sends audio to OpenAI Whisper for transcription
   - Sends text to GPT-4 for response generation
   - Converts response to speech using OpenAI TTS
   - Plays the audio response

### Tech Stack

- **LiveKit**: Real-time audio/video infrastructure
- **OpenAI Whisper**: Speech-to-text transcription
- **OpenAI GPT-4**: Conversational AI
- **OpenAI TTS**: Text-to-speech synthesis
- **Express**: Web server
- **Vanilla JS**: Client-side application

## API Endpoints

### POST `/api/token`

Generate a LiveKit access token for a participant.

**Request Body:**
```json
{
  "roomName": "voice-chat-room",
  "participantName": "user-123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "url": "wss://your-livekit-server.com"
}
```

### GET `/api/openai-key`

Get the OpenAI API key.

**Response:**
```json
{
  "key": "sk-..."
}
```

**Note:** In production, you should proxy OpenAI requests through your server instead of exposing the API key.

## Production Considerations

This is a demo application. For production use, consider:

1. **Security**:
   - Never expose OpenAI API keys to the client
   - Proxy all OpenAI requests through your server
   - Implement proper authentication and authorization
   - Add rate limiting

2. **Performance**:
   - Implement caching for frequently asked questions
   - Use streaming responses for faster feedback
   - Optimize audio encoding/decoding

3. **User Experience**:
   - Add voice activity detection (VAD) for automatic speech detection
   - Support continuous conversation without button pressing
   - Add support for interrupting the AI
   - Show live transcription while speaking

## Troubleshooting

### Microphone not working
- Ensure your browser has permission to access the microphone
- Check that you're using HTTPS or localhost (required for microphone access)

### Audio not playing
- Check your browser's audio settings
- Ensure autoplay is allowed in your browser

### Connection errors
- Verify your LiveKit credentials in `.env`
- Check that your LiveKit server is running and accessible

### OpenAI API errors
- Verify your OpenAI API key is valid
- Check your OpenAI account has sufficient credits
- Ensure you have access to the models (whisper-1, gpt-4, tts-1)

## License

MIT
