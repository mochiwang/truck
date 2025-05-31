import React, { useEffect, useRef, useState } from 'react';
import { startPCMStream, stopPCMStream } from '../utils/startPCMStream';
import { enqueueSpeak } from '../utils/speakQueue';

const WS_URL = process.env.NEXT_PUBLIC_WS_BACKEND || 'wss://speech-backend-xxxx.onrender.com';
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://truck-backend.vercel.app');

export default function LiveListener() {
  console.log('🚀 LiveListener 页面代码已加载！');

  const [status, setStatus] = useState('⏳ 等待开始识别...');
  const [log, setLog] = useState<string[]>([]);
  const [translated, setTranslated] = useState<string[]>([]);
  const [listening, setListening] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTranslatedRef = useRef<string | null>(null);
  const policeHistory = useRef<string[]>([]); // ✅ 缓存最近三条警察英文
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stableTranscript = useRef('');

  const handleTranscript = (incoming: string) => {
    if (incoming !== stableTranscript.current) {
      stableTranscript.current = incoming;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        console.log('⏸️ 触发稳定语音判断，翻译:', stableTranscript.current);
        translateAndSpeak(stableTranscript.current);
      }, 1500);
    }
  };

  const explainLastFewLines = async () => {
    const contextLines = policeHistory.current.slice(-3);
    if (contextLines.length === 0) return;

    const context = contextLines.map((line) => `警察说: ${line}`).join('\n');

    const res = await fetch(`${API_BASE}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    });

    const data = await res.json();
    if (data.explanation) {
      enqueueSpeak(data.explanation);
    } else {
      enqueueSpeak('我不太确定他什么意思');
    }
  };

  const translateAndSpeak = async (text: string) => {
    if (text.includes('没听懂')) {
      console.log('🆘 用户请求 GPT 解释');
      explainLastFewLines();
      return;
    }

    policeHistory.current.push(text);
    if (policeHistory.current.length > 3) {
      policeHistory.current.shift();
    }

    console.log('🎯 正在调用翻译函数，原始英文是：', text);
    try {
      const res = await fetch(`${API_BASE}/api/translateWhisperer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const result = await res.json();
      if (result?.zh) {
        if (lastTranslatedRef.current === result.zh) {
          console.log('⚠️ 跳过重复翻译:', result.zh);
          return;
        }
        lastTranslatedRef.current = result.zh;
        console.log('🈶 中文翻译成功：', result.zh);
        setTranslated((prev) => [...prev, result.zh]);
        enqueueSpeak(result.zh);
      } else {
        console.warn('⚠️ 翻译接口返回无内容');
      }
    } catch (err) {
      console.error('❌ 翻译请求失败:', err);
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
      let transcript = '';
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.transcript) transcript = parsed.transcript;
      } catch {
        transcript = event.data;
      }

      if (transcript?.trim()) {
        setLog((prev) => [...prev, transcript]);
        handleTranscript(transcript);
      }
    };

    ws.onerror = (err) => {
      console.error('❌ WebSocket 错误:', err);
      setStatus('❌ WebSocket 连接错误');
    };

    ws.onclose = () => setStatus('🔌 连接断开');
  };

  const stop = () => {
    stopPCMStream();
    wsRef.current?.close();
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
