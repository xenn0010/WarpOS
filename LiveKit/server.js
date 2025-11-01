import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Endpoint to generate LiveKit access token
app.post('/api/token', async (req, res) => {
  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'roomName and participantName required' });
  }

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: participantName,
      name: participantName,
    }
  );

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  res.json({
    token,
    url: process.env.LIVEKIT_URL,
  });
});

// Endpoint to get OpenAI API key
// Note: In production, you should proxy OpenAI requests through your server
// instead of exposing the API key to the client
app.get('/api/openai-key', (req, res) => {
  res.json({
    key: process.env.OPENAI_API_KEY,
  });
});

// Endpoint to get ElevenLabs API key
// Note: In production, you should proxy ElevenLabs requests through your server
// instead of exposing the API key to the client
app.get('/api/elevenlabs-key', (req, res) => {
  res.json({
    key: process.env.ELEVENLABS_API_KEY,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Open the URL in your browser to start the voice chat demo');
});
