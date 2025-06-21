// speech-backend/server.js
require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const bodyParse = require('body-parser');
const WebSocket = require('ws');
const { SpeechClient }        = require('@google-cloud/speech');
const { TextToSpeechClient }  = require('@google-cloud/text-to-speech');

// ---------- 初始化 ----------
const PORT = process.env.PORT || 4000;
const app  = express();
app.use(cors());                     // 全局 CORS
app.use(bodyParse.json());

const sttClient = new SpeechClient();
const ttsClient = new TextToSpeechClient({
  credentials: process.env.GOOGLE_CLOUD_CREDENTIALS_JSON
    ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON)
    : undefined,                     // 若走 GOOGLE_APPLICATION_CREDENTIALS 路径也 OK
});

// ---------- /api/tts ----------
app.post('/api/tts', async (req, res) => {
  const { text, lang = 'zh-CN' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Missing text' });

  try {
    const [r] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: { languageCode: lang },
      audioConfig: { audioEncoding: 'MP3' },
    });

    const base64 = Buffer.from(r.audioContent).toString('base64');
    res.json({ url: `data:audio/mp3;base64,${base64}` });
  } catch (err) {
    console.error('[TTS] error', err);
    res.status(500).json({ error: 'TTS failed' });
  }
});

// ---------- 启动 HTTP & WS ----------
const server = app.listen(PORT, () =>
  console.log(`🚀 HTTP & WS listening on ${PORT}`)
);
const wss = new WebSocket.Server({ server });

// ---------- WebSocket + STT ----------
wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');

  let recognizeStream = null;
  let restartTimer    = null;

  const startRecognitionStream = () => {
    if (recognizeStream) {
      try { recognizeStream.end(); } catch (_) {}
    }

    console.log('🎤 新的识别流启动');
    recognizeStream = sttClient
      .streamingRecognize({
        config: {
          encoding:           'LINEAR16',
          sampleRateHertz:    16000,
          languageCode:       process.env.LANGUAGE_CODE || 'en-US',
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

    // Google 流式限制≈5 min，提前 4 min50 s 关闭
    restartTimer = setTimeout(() => {
      console.warn('🕒 识别流超时，自动重启');
      if (recognizeStream) recognizeStream.end();
    }, 290_000);
  };

  ws.on('message', (buf) => {
    if (!recognizeStream) startRecognitionStream();
    if (recognizeStream && !recognizeStream.writableEnded) {
      try { recognizeStream.write(Buffer.from(buf)); } catch (_) {}
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    if (recognizeStream) { try { recognizeStream.end(); } catch (_) {} }
    clearTimeout(restartTimer);
  });
});
