// backend/server.js
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
  let restartTimeout = null;

  const startRecognitionStream = () => {
    // 清理旧流
    if (recognizeStream) {
      try {
        recognizeStream.end();
      } catch (e) {
        console.warn('⚠️ 无法 end 旧的流:', e);
      }
      recognizeStream = null;
    }

    console.log('🎤 启动新的识别流');

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
        try {
          ws.close(); // 主动断开连接，由前端重连
        } catch (_) {}
      })
      .on('data', (data) => {
        const text = data.results?.[0]?.alternatives?.[0]?.transcript;
        if (text) {
          console.log('🧠 Recognized:', text);
          ws.send(JSON.stringify({ transcript: text }));
        }
      });

    // 设置最大持续时长保护（Google 限制约 5 分钟）
    restartTimeout = setTimeout(() => {
      console.warn('🕒 超时自动关闭识别流');
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
      }
    }, 290_000); // 比 Google 限制的 305 秒提前结束
  };

  ws.on('message', (msg) => {
    const buffer = Buffer.from(msg);

    if (!recognizeStream) {
      startRecognitionStream();
    }

    if (recognizeStream && !recognizeStream.writableEnded) {
      try {
        recognizeStream.write(buffer);
      } catch (err) {
        console.warn('⚠️ 写入失败:', err);
      }
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');

    if (recognizeStream) {
      try {
        recognizeStream.end();
      } catch (_) {}
      recognizeStream = null;
    }

    clearTimeout(restartTimeout);
  });
});
