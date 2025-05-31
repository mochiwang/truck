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
  const [status, setStatus] = useState('⏳ 等待开始识别...');
  const [translated, setTranslated] = useState<string[]>([]);
  const [listening, setListening] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTranslatedRef = useRef<string | null>(null);
  const policeHistory = useRef<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stableTranscript = useRef('');
  const prevTranscript = useRef<string | null>(null);

  const handleTranscript = (incoming: string) => {
    if (incoming !== stableTranscript.current) {
      stableTranscript.current = incoming;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (stableTranscript.current === prevTranscript.current) return;
        prevTranscript.current = stableTranscript.current;
        translateAndSpeak(stableTranscript.current);
      }, 1500);
    }
  };

  const explainLastFewLines = async () => {
    const contextLines = policeHistory.current.slice(-3);
    if (contextLines.length === 0) return;

    try {
      const res = await fetch(`${API_BASE}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recentTexts: contextLines }),
      });

      const data = await res.json();
      const summaryLine = data.summary
        ?.split('\n')
        .find((line: string) => line.startsWith('【总结】'));
      enqueueSpeak(summaryLine ? summaryLine.replace('【总结】：', '').trim() : '我不太确定他什么意思');
    } catch (err) {
      enqueueSpeak('解释失败，请重试');
    }
  };

  const translateAndSpeak = async (text: string) => {
    const triggerKeywords = [
      '没听懂',
      '没听清',
      '听不明白',
      'mei ting dong',
      'ting bu dong',
      'tingbudong',
      'mei ting dong le',
    ];

    const isTrigger = triggerKeywords.some((p) => text.toLowerCase().includes(p));
    if (isTrigger) {
      console.log('🆘 触发 explain 总结逻辑');
      await explainLastFewLines();
      return;
    }

    if (text.length < 6 || policeHistory.current.includes(text)) return;

    if (/[.?!。？！]$/.test(text.trim())) {
      policeHistory.current.push(text.trim());
      if (policeHistory.current.length > 10) {
        policeHistory.current.shift();
      }
    }

    try {
      const res = await fetch(`${API_BASE}/api/translateWhisperer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const result = await res.json();
      if (result?.zh) {
        if (lastTranslatedRef.current === result.zh) return;
        lastTranslatedRef.current = result.zh;
        setTranslated((prev) => [...prev, result.zh]);
        enqueueSpeak(result.zh);
      }
    } catch {}
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
        handleTranscript(transcript);
      }
    };

    ws.onerror = () => {
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

      <div style={boxStyleAlt}>
        <strong>中文翻译：</strong>
        {translated.length === 0 ? '🈳 正在准备翻译…' : translated.join('\n')}
      </div>
    </div>
  );
}

const boxStyleAlt: React.CSSProperties = {
  marginTop: 12,
  padding: 16,
  background: '#fdfdfd',
  border: '1px solid #ddd',
  borderRadius: 6,
  width: '80%',
  maxWidth: 600,
  margin: '0 auto',
  textAlign: 'left',
  fontSize: 16,
  minHeight: 100,
  whiteSpace: 'pre-line',
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
