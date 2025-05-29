require('dotenv').config();
const fs = require('fs');
const Vad = require('node-webrtcvad');
const recorder = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
const WebSocket = require('ws');

const PORT = process.env.PORT || 4000;
const vad = new Vad(Vad.Mode.AGGRESSIVE);
const client = new speech.SpeechClient();

const wss = new WebSocket.Server({ port: PORT });
console.log(`🚀 WebSocket server started on port ${PORT}`);

wss.on('connection', (ws) => {
  console.log('✅ Client connected');

  let recognizeStream = null;
  let lastVoiceTime = Date.now();

  const startStream = () => {
    recognizeStream = client
      .streamingRecognize({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: process.env.LANGUAGE_CODE || 'en-US',
        },
        interimResults: true,
      })
      .on('data', (data) => {
        const text = data.results?.[0]?.alternatives?.[0]?.transcript;
        if (text) {
          console.log('🎙️', text);
          ws.send(JSON.stringify({ transcript: text }));
        }
      });
  };

  const stopStream = () => {
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
      console.log('🛑 Recognize stream stopped (silence timeout)');
    }
  };

  const mic = recorder.record({
    sampleRateHertz: 16000,
    threshold: 0,
    silence: '1.0',
    recordProgram: 'sox',
  });

  const stream = mic.stream();

  stream.on('data', async (chunk) => {
    const isSpeech = await vad.processAudio(chunk, 16000);
    const now = Date.now();

    if (isSpeech) {
      if (!recognizeStream) startStream();
      recognizeStream.write(chunk);
      lastVoiceTime = now;
    } else {
      if (recognizeStream && now - lastVoiceTime > 1500) {
        stopStream();
      }
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    mic.stop();
    stopStream();
  });
});
