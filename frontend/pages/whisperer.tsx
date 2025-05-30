// frontend/pages/whisperer.tsx

import React, { useEffect } from 'react';
import { startPCMStream, stopPCMStream } from '../utils/startPCMStream';

export default function WhispererPage() {
  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_BACKEND!);

    ws.onopen = async () => {
      console.log('📡 WebSocket connected');
      await startPCMStream(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.transcript) {
          console.log('🧠 Recognized:', data.transcript);
        }
      } catch (err) {
        console.error('消息处理失败:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
    };

    return () => {
      stopPCMStream();
      ws.close();
    };
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>🧠 低语者 Whisperer</h1>
      <p style={{ fontSize: 18, marginBottom: 20 }}>
        当前模式下，系统将持续监听并翻译警察的讲话。
      </p>

      <div style={{ marginTop: 40, padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
        <p style={{ color: '#555' }}>🎙️ 正在监听中，请说话……</p>
        <p style={{ fontWeight: 'bold', fontSize: 20 }}>识别结果将在控制台显示</p>
      </div>

      <p style={{ fontSize: 14, marginTop: 12, color: '#888' }}>
        🗣️ 说英语试试看，系统会实时显示英文识别结果。
      </p>
    </div>
  );
}
