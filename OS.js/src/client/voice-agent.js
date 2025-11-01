/**
 * Voice Agent Service for OS.js
 * Integrates LiveKit voice chat with OpenAI Whisper and ElevenLabs TTS
 */

export class VoiceAgentService {
  constructor(core) {
    this.core = core;
    this.room = null;
    this.isConnected = false;
    this.isRecording = false;
    this.isProcessing = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.conversationHistory = [];
    this.LivekitClient = null;

    // VAD (Voice Activity Detection) settings
    this.silenceThreshold = -35;
    this.silenceDuration = 800;
    this.minSpeechDuration = 300;
    this.maxRecordingDuration = 10000;
    this.silenceStart = null;
    this.speechStart = null;
    this.audioContext = null;
    this.analyser = null;
    this.isSpeaking = false;

    // UI elements
    this.voiceButton = null;
    this.statusIndicator = null;
    this.transcriptContainer = null;

    this.init();
  }

  async init() {
    // Load LiveKit client library
    await this.loadLiveKitClient();
    this.createUI();
    this.setupEventListeners();

    // Auto-start voice agent in background
    setTimeout(() => this.connect(), 1000);
  }

  async loadLiveKitClient() {
    return new Promise((resolve, reject) => {
      if (window.LivekitClient) {
        this.LivekitClient = window.LivekitClient;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = '/voice-agent/livekit-client.umd.js';
      script.onload = () => {
        this.LivekitClient = window.LivekitClient;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  createUI() {
    // Create minimized voice indicator
    this.voiceButton = document.createElement('div');
    this.voiceButton.id = 'warp-voice-button';
    this.voiceButton.className = 'warp-voice-button warp-voice-minimized';
    this.voiceButton.innerHTML = `
      <div class="warp-voice-button-icon">🎤</div>
      <div class="warp-voice-button-status"></div>
    `;
    this.voiceButton.title = 'Click to show voice chat transcript';
    document.body.appendChild(this.voiceButton);

    // Create transcript container (hidden by default)
    this.transcriptContainer = document.createElement('div');
    this.transcriptContainer.id = 'warp-voice-transcript';
    this.transcriptContainer.className = 'warp-voice-transcript hidden';
    this.transcriptContainer.innerHTML = `
      <div class="warp-voice-transcript-header">
        <h3>Voice Chat</h3>
        <button class="warp-voice-close">×</button>
      </div>
      <div class="warp-voice-messages"></div>
      <div class="warp-voice-status">Not connected</div>
    `;
    document.body.appendChild(this.transcriptContainer);

    this.statusIndicator = this.voiceButton.querySelector('.warp-voice-button-status');
  }

  setupEventListeners() {
    // Voice button toggles transcript visibility, not connection
    this.voiceButton.addEventListener('click', () => this.toggleTranscript());

    const closeBtn = this.transcriptContainer.querySelector('.warp-voice-close');
    closeBtn.addEventListener('click', () => {
      this.transcriptContainer.classList.add('hidden');
    });
  }

  toggleTranscript() {
    this.transcriptContainer.classList.toggle('hidden');
  }

  async toggleConnection() {
    if (this.isConnected) {
      await this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connect() {
    try {
      this.updateStatus('Connecting...', 'connecting');

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      // Get token from server
      const response = await fetch('/api/voice-agent/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: 'warpos-voice-room',
          participantName: `user-${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get LiveKit token');
      }

      const { token, url } = await response.json();

      // Connect to LiveKit room
      const { Room, RoomEvent, Track } = this.LivekitClient;
      this.room = new Room();

      this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          this.handleAudioTrack(track, participant);
        }
      });

      await this.room.connect(url, token);
      await this.room.localParticipant.setMicrophoneEnabled(true);

      this.isConnected = true;
      this.voiceButton.classList.add('connected');
      this.updateStatus('Connected - Listening...', 'connected');

      // Start continuous listening
      await this.startContinuousListening();

    } catch (error) {
      console.error('Connection error:', error);
      this.updateStatus(`Error: ${error.message}`, 'error');

      // Only show notification for critical errors
      if (error.message.includes('permission') || error.message.includes('token')) {
        this.core.make('osjs/notification', {
          title: 'Voice Agent',
          message: error.message
        });
      }
    }
  }

  async disconnect() {
    this.isConnected = false;
    this.isRecording = false;
    this.isProcessing = false;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }

    this.voiceButton.classList.remove('connected', 'speaking');
    this.updateStatus('Disconnected', 'disconnected');
  }

  handleAudioTrack(track, participant) {
    console.log(`Received audio from ${participant.identity}`);
    const audioElement = track.attach();
    audioElement.play();
    this.voiceButton.classList.add('speaking');
    setTimeout(() => {
      this.voiceButton.classList.remove('speaking');
    }, 2000);
  }

  async startContinuousListening() {
    if (!this.isConnected || this.isRecording) return;

    try {
      this.isRecording = true;
      this.audioChunks = [];
      this.speechStart = null;
      this.silenceStart = null;
      this.isSpeaking = false;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      this.analyser.fftSize = 512;

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        if (this.isConnected && !this.isProcessing) {
          await this.processRecording();
        }
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.monitorVoiceActivity();

    } catch (error) {
      console.error('Recording error:', error);
      this.updateStatus(`Recording error: ${error.message}`, 'error');
      this.isRecording = false;
    }
  }

  monitorVoiceActivity() {
    if (!this.isRecording || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudio = () => {
      if (!this.isRecording || this.isProcessing) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const volume = 20 * Math.log10(average / 255);

      const now = Date.now();

      if (volume > this.silenceThreshold) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.speechStart = now;
          this.voiceButton.classList.add('listening');
          this.updateStatus('🎤 Listening to you...', 'listening');
        }
        this.silenceStart = null;

        if (this.speechStart && (now - this.speechStart > this.maxRecordingDuration)) {
          this.stopRecording();
          return;
        }
      } else {
        if (this.isSpeaking) {
          if (!this.silenceStart) {
            this.silenceStart = now;
          } else if (now - this.silenceStart > this.silenceDuration) {
            const speechDuration = this.speechStart ? (this.silenceStart - this.speechStart) : 0;

            if (speechDuration > this.minSpeechDuration) {
              this.stopRecording();
              return;
            } else {
              this.isSpeaking = false;
              this.speechStart = null;
              this.silenceStart = null;
              this.voiceButton.classList.remove('listening');
              this.updateStatus('Connected - Listening...', 'connected');
            }
          }
        }
      }

      requestAnimationFrame(checkAudio);
    };

    checkAudio();
  }

  async stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.voiceButton.classList.remove('listening');

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  async processRecording() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      this.updateStatus('Processing...', 'processing');

      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

      if (audioBlob.size < 1000) {
        this.isProcessing = false;
        this.updateStatus('Connected - Listening...', 'connected');
        if (this.isConnected) {
          await this.startContinuousListening();
        }
        return;
      }

      const transcription = await this.transcribeAudio(audioBlob);

      if (!transcription || transcription.trim().length === 0) {
        this.isProcessing = false;
        this.updateStatus('Connected - Listening...', 'connected');
        if (this.isConnected) {
          await this.startContinuousListening();
        }
        return;
      }

      this.addMessage('user', transcription);

      this.updateStatus('Thinking...', 'processing');
      const response = await this.getChatResponse(transcription);
      this.addMessage('assistant', response);

      this.updateStatus('Speaking...', 'speaking');
      await this.speak(response);

      this.isProcessing = false;
      this.updateStatus('Connected - Listening...', 'connected');

      if (this.isConnected) {
        await this.startContinuousListening();
      }

    } catch (error) {
      console.error('Processing error:', error);
      this.updateStatus(`Error: ${error.message}`, 'error');
      this.isProcessing = false;

      if (this.isConnected) {
        setTimeout(() => this.startContinuousListening(), 2000);
      }
    }
  }

  async transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const apiKey = await this.getOpenAIKey();
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    const data = await response.json();
    return data.text;
  }

  async getChatResponse(message) {
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    const apiKey = await this.getOpenAIKey();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful voice assistant for WarpOS. Keep responses concise and natural for voice conversation (2-3 sentences max). You can help with operating system tasks, opening applications, and answering questions.'
          },
          ...this.conversationHistory
        ],
        max_tokens: 150
      })
    });

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    return assistantMessage;
  }

  async speak(text) {
    if (!text || text.trim().length === 0) return;

    const voiceId = 'UgBBYS2sOqTuMpoF3BR0';
    const apiKey = await this.getElevenLabsKey();

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
      throw new Error(`TTS error: ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      audio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Failed to play audio'));
      };
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.play().catch((e) => {
        URL.revokeObjectURL(audioUrl);
        reject(e);
      });
    });
  }

  async getOpenAIKey() {
    const response = await fetch('/api/voice-agent/openai-key');
    const data = await response.json();
    return data.key;
  }

  async getElevenLabsKey() {
    const response = await fetch('/api/voice-agent/elevenlabs-key');
    const data = await response.json();
    return data.key;
  }

  addMessage(role, content) {
    const messagesContainer = this.transcriptContainer.querySelector('.warp-voice-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `warp-voice-message warp-voice-message--${role}`;
    messageDiv.innerHTML = `
      <div class="warp-voice-message-role">${role === 'user' ? 'You' : 'AI Assistant'}</div>
      <div class="warp-voice-message-content">${content}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  updateStatus(message, className = '') {
    const statusDiv = this.transcriptContainer.querySelector('.warp-voice-status');
    statusDiv.textContent = message;
    statusDiv.className = 'warp-voice-status warp-voice-status--' + className;
  }

  destroy() {
    if (this.isConnected) {
      this.disconnect();
    }
    if (this.voiceButton) {
      this.voiceButton.remove();
    }
    if (this.transcriptContainer) {
      this.transcriptContainer.remove();
    }
  }
}

export const VoiceAgentServiceProvider = class VoiceAgentServiceProvider {
  constructor(core, args) {
    this.core = core;
    this.voiceAgent = null;
  }

  provides() {
    return ['osjs/voice-agent'];
  }

  async init() {
    this.voiceAgent = new VoiceAgentService(this.core);
    this.core.instance('osjs/voice-agent', () => this.voiceAgent);
  }

  start() {
    // Service is ready
  }

  destroy() {
    if (this.voiceAgent) {
      this.voiceAgent.destroy();
    }
  }
};
