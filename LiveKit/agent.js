import { Room, RoomEvent, Track } from 'livekit-client';
import { AccessToken } from 'livekit-server-sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class VoiceAgent {
  constructor() {
    this.room = new Room();
    this.conversationHistory = [
      {
        role: 'system',
        content: 'You are a helpful voice assistant. Keep responses concise and natural for voice conversation. Be friendly and engaging.',
      },
    ];
    this.isProcessing = false;
    this.audioChunks = [];
  }

  async connect(roomName) {
    // Generate token for the agent
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: 'voice-agent',
        name: 'Voice Agent',
      }
    );

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    // Connect to room
    await this.room.connect(process.env.LIVEKIT_URL, token);
    console.log(`Agent connected to room: ${roomName}`);

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Listen for participants joining
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log(`Participant connected: ${participant.identity}`);
      this.speakGreeting();
    });

    // Listen for track subscriptions (audio from user)
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        console.log(`Subscribed to audio track from ${participant.identity}`);
        this.handleAudioTrack(track, participant);
      }
    });
  }

  async speakGreeting() {
    await this.speak("Hello! I'm your voice assistant. How can I help you today?");
  }

  async handleAudioTrack(track, participant) {
    // Create media stream from track
    const mediaStream = new MediaStream([track.mediaStreamTrack]);

    // For simplicity, we'll use a basic approach:
    // When user speaks, we collect audio and send to OpenAI Whisper
    console.log('Listening to user audio...');

    // Note: In a production app, you'd implement VAD (Voice Activity Detection)
    // For this demo, we'll process audio in intervals
    this.startAudioProcessing(mediaStream);
  }

  async startAudioProcessing(mediaStream) {
    // This is a simplified version - in production you'd want proper VAD
    // and streaming audio processing
    console.log('Audio processing started. Listening for speech...');

    // For demo purposes, we'll indicate the agent is ready
    console.log('Agent ready to respond to voice input');
  }

  async transcribeAudio(audioBuffer) {
    try {
      // Save audio buffer to temporary file
      const tempFile = path.join(__dirname, 'temp_audio.wav');
      fs.writeFileSync(tempFile, audioBuffer);

      // Transcribe with OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: 'whisper-1',
      });

      // Clean up temp file
      fs.unlinkSync(tempFile);

      return transcription.text;
    } catch (error) {
      console.error('Transcription error:', error);
      return null;
    }
  }

  async getChatResponse(userMessage) {
    try {
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: this.conversationHistory,
        max_tokens: 150,
      });

      const assistantMessage = completion.choices[0].message.content;

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('Chat error:', error);
      return 'Sorry, I encountered an error processing your request.';
    }
  }

  async speak(text) {
    try {
      console.log(`Agent speaking: ${text}`);

      // Generate speech with ElevenLabs TTS
      const voiceId = 'UgBBYS2sOqTuMpoF3BR0';
      const apiKey = process.env.ELEVENLABS_API_KEY;
      
      if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY environment variable is not set');
      }

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS error: ${response.statusText}`);
      }

      // Get audio buffer
      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // Publish audio to room
      await this.publishAudio(audioBuffer);
    } catch (error) {
      console.error('TTS error:', error);
    }
  }

  async publishAudio(audioBuffer) {
    // Save to temp file and create audio track
    const tempFile = path.join(__dirname, 'temp_speech.mp3');
    fs.writeFileSync(tempFile, audioBuffer);

    // In a real implementation, you'd create an audio track from the buffer
    // and publish it to the room. This requires additional audio processing.
    console.log('Audio generated and ready to publish');

    // Clean up
    fs.unlinkSync(tempFile);
  }

  async processUserSpeech(audioBuffer) {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // Transcribe speech to text
      const userText = await this.transcribeAudio(audioBuffer);
      if (!userText) {
        this.isProcessing = false;
        return;
      }

      console.log(`User said: ${userText}`);

      // Get LLM response
      const response = await this.getChatResponse(userText);

      // Speak the response
      await this.speak(response);
    } catch (error) {
      console.error('Error processing speech:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Start the agent
const roomName = process.env.ROOM_NAME || 'voice-chat-room';
const agent = new VoiceAgent();

agent.connect(roomName).then(() => {
  console.log('Voice agent is running!');
}).catch((error) => {
  console.error('Error starting agent:', error);
});
