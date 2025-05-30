import React, { useEffect, useRef, useState } from 'react';
import { startPCMStream, stopPCMStream } from '../utils/startPCMStream';

const WS_URL = process.env.NEXT_PUBLIC_WS_BACKEND || 'wss://speech-backend-xxxx.onrender.com';

export default function LiveListener() {
  const [status, setStatus] = useState('⏳ 等待开始识别...');
  const [log, setLog] = useState<string[]>([]);
  const [translated, setTranslated] = useState<string[]>([]);
  const [listening, setListening] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const translateAndSpeak = async (text: string) => {
    try {
      const res = await fetch('/api/translateWhisperer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const result = await res.json();

      if (result?.zh) {
        setTranslated((prev) => [...prev, result.zh]);

        const utter = new SpeechSynthesisUtterance(result.zh);
        utter.lang = 'zh-CN';
        speechSynthesis.speak(utter);
      }
    } catch (err) {
      console.error('翻译失败:', err);
    }
  };

  const start = async () => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      setStatus('🎙️ 麦克风已开启，识别中...');
      const audioContext = await startPCMStream(ws);
      audioContextRef.current = audioContext;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.transcript) {
          setLog((prev) => [...prev, data.transcript]);
          translateAndSpeak(data.transcript);
        }
      } catch (err) {
        console.error('消息处理失败:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket 错误:', err);
      setStatus('❌ WebSocket 连接错误');
    };

    ws.onclose = () => {
      setStatus('🔌 连接断开');
    };
  };

  const stop = () => {
    stopPCMStream();
    wsRef.current?.close();
    audioContextRef.current?.close();
    setStatus('🛑 识别已停止');
  };

  useEffect(() => {
    return () => stop();
  }, []);

  return (
    <div style={{ marginTop: 20 }}>
      <button
        onClick={() => {
          if (listening) stop();
          else start();
          setListening(!listening);
        }}
        style={{
          padding: '10px 20px',
          backgroundColor: listening ? '#f44336' : '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        {listening ? '🛑 停止识别' : '🎤 开始识别'}
      </button>

      <div style={badgeStyle(status)}>{status}</div>

      <div style={boxStyle}>
        <strong>英文识别：</strong>
        {log.length === 0 ? '🕰️ 正在等待语音输入…' : log.join('\n')}
      </div>

      <div style={boxStyleAlt}>
        <strong>中文翻译：</strong>
        {translated.length === 0 ? '🈳 正在准备翻译…' : translated.join('\n')}
      </div>
    </div>
  );
}

// ✅ 样式定义（不要漏）
const boxStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 16,
  background: '#f0f0f0',
  border: '1px solid #ccc',
  borderRadius: 6,
  width: '80%',
  maxWidth: 600,
  margin: '0 auto',
  textAlign: 'left',
  fontSize: 16,
  minHeight: 100,
  whiteSpace: 'pre-line',
};

const boxStyleAlt: React.CSSProperties = {
  ...boxStyle,
  background: '#fdfdfd',
  border: '1px solid #ddd',
  marginTop: 12,
};

const badgeStyle = (status: string): React.CSSProperties => {
  let bg = '#aaa';
  if (status.includes('🎙️')) bg = '#4caf50';
  else if (status.includes('❌')) bg = '#f44336';
  else if (status.includes('🔌')) bg = '#ff9800';
  else if (status.includes('⏳')) bg = '#2196f3';
  else if (status.includes('🛑')) bg = '#9e9e9e';

  return {
    backgroundColor: bg,
    color: '#fff',
    padding: '8px 16px',
    borderRadius: 8,
    display: 'inline-block',
    marginBottom: 12,
    fontWeight: 'bold',
    fontSize: 16,
  };
};
