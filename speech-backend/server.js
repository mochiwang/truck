// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const { SpeechClient } = require('@google-cloud/speech');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

// ---------- 基本初始化 ----------
const PORT = process.env.PORT || 4000;
const app  = express();
app.use(cors());                 // ← 全局 CORS
app.use(bodyParser.json());

const sttClient = new SpeechClient();
const ttsClient = new TextToSpeechClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON),
});

// ---------- TTS 路由 ----------
app.post('/api/tts', async (req, res) => {
  const { text, lang = 'zh-CN' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing text' });

  try {
    const [resp] = await ttsClient.synthesizeSpeech({
      input:  { text },
      voice:  { languageCode: lang },
      audioConfig: { audioEncoding: 'MP3' },
    });
    const base64 = Buffer.from(resp.audioContent).toString('base64');
    res.json({ url: `data:audio/mp3;base64,${base64}` });
  } catch (e) {
    console.error('[TTS] error', e);
    res.status(500).json({ error: 'TTS failed' });
  }
});

// ---------- 启动 HTTP & WebSocket ----------
const server = app.listen(PORT, () =>
  console.log(`🚀 HTTP & WS listening on ${PORT}`)
);
const wss = new WebSocket.Server({ server });

// ---------- 下面保留你原来的 WebSocket 代码 ----------
wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');
  let recognizeStream = null;
  let restartTimeout  = null;

  const startRecognitionStream = () => {
    if (recognizeStream) {
      try { recognizeStream.end(); } catch (_) {}
      recognizeStream = null;
    }
    console.log('🎤 启动新的识别流');
    recognizeStream = sttClient
      .streamingRecognize({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: process.env.LANGUAGE_CODE || 'en-US',
        },
        interimResults: true,
      })
      .on('error', (err) => {
        console.error('❌ STT error:', err);
        ws.send(JSON.stringify({ error: err.message }));
        try { ws.close(); } catch (_) {}
      })
      .on('data', (data) => {
        const text = data.results?.[0]?.alternatives?.[0]?.transcript;
        if (text) {
          console.log('🧠 Recognized:', text);
          ws.send(JSON.stringify({ transcript: text }));
        }
      });

    restartTimeout = setTimeout(() => {
      console.warn('🕒 超时自动关闭识别流');
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
      }
    }, 290_000);
  };

  ws.on('message', (msg) => {
    if (!recognizeStream) startRecognitionStream();
    if (recognizeStream && !recognizeStream.writableEnded) {
      try { recognizeStream.write(Buffer.from(msg)); } catch (_) {}
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    if (recognizeStream) { try { recognizeStream.end(); } catch (_) {} }
    clearTimeout(restartTimeout);
  });
});
