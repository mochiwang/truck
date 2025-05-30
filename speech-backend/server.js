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
        console.error('❌ STT error:', err.message);
        ws.send(JSON.stringify({ error: err.message }));
        // 自动销毁流（防止后续 write 报错）
        recognizeStream?.destroy();
        recognizeStream = null;
      })
      .on('data', (data) => {
        const text = data.results?.[0]?.alternatives?.[0]?.transcript;
        if (text) {
          console.log('🧠 Recognized:', text);
          ws.send(JSON.stringify({ transcript: text }));
        }
      });
  };

  ws.on('message', (msg) => {
    const buffer = Buffer.from(msg);

    // ⚠️ 检查流是否有效（destroyed 或 writableEnded 都代表不能再用）
    const invalid =
      !recognizeStream ||
      recognizeStream.destroyed ||
      recognizeStream.writableEnded;

    if (invalid) {
      console.log('🎤 (Re)starting recognition stream');
      startRecognitionStream();
    }

    try {
      recognizeStream?.write(buffer);
    } catch (err) {
      console.error('❌ 写入 STT 出错:', err.message);
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    recognizeStream?.destroy();
    recognizeStream = null;
  });
});
