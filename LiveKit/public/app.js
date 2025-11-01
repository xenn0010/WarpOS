// Wait for the page and LiveKit library to load
window.addEventListener('DOMContentLoaded', () => {
    if (typeof LivekitClient === 'undefined') {
        console.error('LivekitClient is not loaded. Please check the CDN link.');
        alert('Error loading LiveKit library. Please refresh the page.');
        return;
    }

    const { Room, RoomEvent, Track, VideoPresets } = LivekitClient;

class VoiceChat {
    constructor() {
        this.room = null;
        this.isConnected = false;
        this.isRecording = false;
        this.isProcessing = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.conversationHistory = [];

        // VAD (Voice Activity Detection) settings
        this.silenceThreshold = -35; // dB (higher = less sensitive to background noise)
        this.silenceDuration = 800; // ms of silence before stopping
        this.minSpeechDuration = 300; // ms minimum speech before processing
        this.maxRecordingDuration = 10000; // ms maximum recording duration
        this.silenceStart = null;
        this.speechStart = null;
        this.audioContext = null;
        this.analyser = null;
        this.isSpeaking = false;

        this.connectBtn = document.getElementById('connectBtn');
        this.statusDiv = document.getElementById('status');
        this.transcriptDiv = document.getElementById('transcript');
        this.visualizer = document.getElementById('visualizer');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.connectBtn.addEventListener('click', () => this.toggleConnection());
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
            this.updateStatus('Connecting...');

            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately, we'll use it later

            // Get token from server
            const response = await fetch('/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomName: 'voice-chat-room',
                    participantName: `user-${Date.now()}`
                })
            });

            const { token, url } = await response.json();

            // Connect to LiveKit room
            this.room = new Room();

            // Setup room event handlers
            this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
                if (track.kind === Track.Kind.Audio) {
                    this.handleAudioTrack(track, participant);
                }
            });

            await this.room.connect(url, token);

            // Enable microphone
            await this.room.localParticipant.setMicrophoneEnabled(true);

            this.isConnected = true;
            this.connectBtn.textContent = 'Disconnect';
            this.updateStatus('Connected! Listening... just start speaking', 'connected');
            this.transcriptDiv.classList.remove('hidden');

            // Start continuous listening mode
            await this.startContinuousListening();

        } catch (error) {
            console.error('Connection error:', error);
            this.updateStatus(`Error: ${error.message}`);
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

        this.connectBtn.textContent = 'Connect';
        this.updateStatus('Disconnected');
    }

    handleAudioTrack(track, participant) {
        console.log(`Received audio from ${participant.identity}`);

        // Play the audio
        const audioElement = track.attach();
        audioElement.play();

        // Show visual feedback
        this.visualizer.classList.add('active');
        setTimeout(() => {
            this.visualizer.classList.remove('active');
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

            // Get microphone stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup audio analysis for VAD
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

            // Start VAD monitoring
            this.monitorVoiceActivity();

        } catch (error) {
            console.error('Recording error:', error);
            this.updateStatus(`Recording error: ${error.message}`);
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

            // Calculate average volume
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;
            const volume = 20 * Math.log10(average / 255);

            // Log volume levels occasionally for debugging
            if (Math.random() < 0.05) {
                console.log(`Volume: ${volume.toFixed(2)} dB (threshold: ${this.silenceThreshold} dB)`);
            }

            const now = Date.now();

            if (volume > this.silenceThreshold) {
                // Speech detected
                if (!this.isSpeaking) {
                    this.isSpeaking = true;
                    this.speechStart = now;
                    this.visualizer.classList.add('active');
                    this.updateStatus('🎤 Listening to you...', 'speaking');
                }
                this.silenceStart = null;

                // Check if maximum recording duration exceeded
                if (this.speechStart && (now - this.speechStart > this.maxRecordingDuration)) {
                    console.log('Max recording duration reached, processing audio');
                    this.stopRecording();
                    return;
                }
            } else {
                // Silence detected
                if (this.isSpeaking) {
                    if (!this.silenceStart) {
                        this.silenceStart = now;
                    } else if (now - this.silenceStart > this.silenceDuration) {
                        // Enough silence detected, check if we have minimum speech
                        const speechDuration = this.speechStart ? (this.silenceStart - this.speechStart) : 0;

                        if (speechDuration > this.minSpeechDuration) {
                            // Valid speech detected, stop and process
                            this.stopRecording();
                            return;
                        } else {
                            // Too short, reset
                            this.isSpeaking = false;
                            this.speechStart = null;
                            this.silenceStart = null;
                            this.visualizer.classList.remove('active');
                            this.updateStatus('Connected! Listening... just start speaking', 'connected');
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
        this.visualizer.classList.remove('active');

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    async processRecording() {
        if (this.isProcessing) return;

        try {
            this.isProcessing = true;
            this.updateStatus('Processing...', 'speaking');

            // Create audio blob
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

            // Check if blob has content
            if (audioBlob.size < 1000) {
                this.isProcessing = false;
                this.updateStatus('Connected! Listening... just start speaking', 'connected');
                if (this.isConnected) {
                    await this.startContinuousListening();
                }
                return;
            }

            // Transcribe audio using OpenAI Whisper
            const transcription = await this.transcribeAudio(audioBlob);

            if (!transcription || transcription.trim().length === 0) {
                this.isProcessing = false;
                this.updateStatus('Connected! Listening... just start speaking', 'connected');
                if (this.isConnected) {
                    await this.startContinuousListening();
                }
                return;
            }

            this.addMessage('user', transcription);

            // Get AI response
            this.updateStatus('Thinking...');
            const response = await this.getChatResponse(transcription);
            this.addMessage('assistant', response);

            // Convert response to speech
            this.updateStatus('Speaking...');
            await this.speak(response);

            this.isProcessing = false;
            this.updateStatus('Connected! Listening... just start speaking', 'connected');

            // Resume listening for next input
            if (this.isConnected) {
                await this.startContinuousListening();
            }

        } catch (error) {
            console.error('Processing error:', error);
            this.updateStatus(`Error: ${error.message}`);
            this.isProcessing = false;

            // Resume listening even after error
            if (this.isConnected) {
                setTimeout(() => this.startContinuousListening(), 2000);
            }
        }
    }

    async transcribeAudio(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await this.getOpenAIKey()}`
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

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await this.getOpenAIKey()}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful voice assistant. Keep responses concise and natural for voice conversation (2-3 sentences max).'
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
        if (!text || text.trim().length === 0) {
            console.warn('Empty text provided to speak function');
            return;
        }

        const voiceId = 'UgBBYS2sOqTuMpoF3BR0';
        const apiKey = await this.getElevenLabsKey();
        
        if (!apiKey) {
            throw new Error('ElevenLabs API key is not configured. Please set ELEVENLABS_API_KEY in your .env file.');
        }

        try {
            // Build request body - model_id is optional as not all accounts have access to all models
            const requestBody = {
                text: text,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            };
            
            // Only include model_id if we want to specify it (optional)
            // If your account doesn't have access to this model, remove this line
            requestBody.model_id = 'eleven_multilingual_v2';

            console.log('Sending TTS request to ElevenLabs:', {
                voiceId,
                textLength: text.length,
                hasApiKey: !!apiKey
            });

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                // Try to get the actual error message from the response
                let errorMessage = `ElevenLabs TTS error: ${response.status} ${response.statusText}`;
                
                // Read the response body once
                const contentType = response.headers.get('content-type');
                let errorData = null;
                
                try {
                    if (contentType && contentType.includes('application/json')) {
                        errorData = await response.json();
                    } else {
                        const errorText = await response.text();
                        if (errorText) {
                            errorData = { message: errorText };
                        }
                    }
                } catch (e) {
                    console.warn('Could not parse error response:', e);
                }
                
                // Extract error message from response
                if (errorData) {
                    if (errorData.detail) {
                        if (typeof errorData.detail === 'string') {
                            errorMessage = `ElevenLabs TTS error: ${errorData.detail}`;
                        } else if (errorData.detail.message) {
                            errorMessage = `ElevenLabs TTS error: ${errorData.detail.message}`;
                        }
                    } else if (errorData.message) {
                        errorMessage = `ElevenLabs TTS error: ${errorData.message}`;
                    } else if (typeof errorData === 'string') {
                        errorMessage = `ElevenLabs TTS error: ${errorData}`;
                    }
                }
                
                console.error('ElevenLabs API Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData: errorData
                });
                
                throw new Error(errorMessage);
            }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

            return new Promise((resolve, reject) => {
                audio.onerror = (e) => {
                    console.error('Audio playback error:', e);
                    URL.revokeObjectURL(audioUrl);
                    reject(new Error('Failed to play audio'));
                };
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
            };
                audio.play().catch((e) => {
                    console.error('Audio play error:', e);
                    URL.revokeObjectURL(audioUrl);
                    reject(e);
                });
            });
        } catch (error) {
            console.error('Speak function error:', error);
            throw error;
        }
    }

    async getOpenAIKey() {
        // In production, you'd get this from your server
        // For this demo, we'll fetch it from the server
        const response = await fetch('/api/openai-key');
        const data = await response.json();
        return data.key;
    }

    async getElevenLabsKey() {
        // In production, you'd get this from your server
        // For this demo, we'll fetch it from the server
        const response = await fetch('/api/elevenlabs-key');
        const data = await response.json();
        return data.key;
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `
            <div class="role">${role === 'user' ? 'You' : 'AI Assistant'}</div>
            <div class="content">${content}</div>
        `;
        this.transcriptDiv.appendChild(messageDiv);
        this.transcriptDiv.scrollTop = this.transcriptDiv.scrollHeight;
    }

    updateStatus(message, className = '') {
        this.statusDiv.textContent = message;
        this.statusDiv.className = 'status ' + className;
    }
}

// Initialize the app
    const voiceChat = new VoiceChat();
});
