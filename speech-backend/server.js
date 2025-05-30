require('dotenv').config();
const WebSocket = require('ws');
const { SpeechClient } = require('@google-cloud/speech');

const PORT = process.env.PORT || 4000;
const client = new SpeechClient();

const wss = new WebSocket.Server({ port: PORT });
console.log(`🚀 WebSocket server listening on port ${PORT}`);

wss.on('connection', (ws) => {
  console.log('✅ WebSocket client connected');

  let recognizeStream = null;

  const startRecognitionStream = () => {
    if (recognizeStream) {
      try {
        recognizeStream.destroy(); // 彻底关闭旧的
      } catch (e) {}
      recognizeStream = null;
    }

    recognizeStream = client
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
        ws.close(); // 主动断开客户端（由前端重连）
      })
      .on('data', (data) => {
        const text = data.results?.[0]?.alternatives?.[0]?.transcript;
        if (text) {
          console.log('🧠 Recognized:', text);
          ws.send(JSON.stringify({ transcript: text }));
        }
      });

    console.log('🎤 (Re)starting recognition stream');
  };

  ws.on('message', (msg) => {
    const buffer = Buffer.from(msg);

    if (!recognizeStream) {
      startRecognitionStream();
    }

    if (recognizeStream && !recognizeStream.writableEnded) {
      recognizeStream.write(buffer);
    } else {
      console.warn('⚠️ 写入失败：流已关闭');
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
  });
});
