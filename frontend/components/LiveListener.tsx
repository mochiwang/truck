import React, { useEffect, useRef, useState } from 'react';
import { startPCMStream, stopPCMStream } from '../utils/startPCMStream';
import { enqueueSpeak } from '../utils/speakQueue';

const WS_URL = process.env.NEXT_PUBLIC_WS_BACKEND!;
const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://truck-backend.vercel.app');

const PRIORITY_PHRASES = [
  'stop', 'pull over', 'license', 'registration',
  'insurance', 'step out', 'wait', 'hands', 'open the door',
  'slow down', 'speeding', 'turn off the engine',
];

const JARVIS_KEYWORDS = [
  'jarvis', '贾维斯', '假维斯', '家务事',
  'jiaweis', 'jia vis', 'javis', 'java s',
  'service', 'jervis', 'jer vis', '杰维斯',
  '加我说', '叫我说', '家里事', '驾驶',
];

type LiveListenerProps = {
  onStop?: () => void;
};

export default function LiveListener({ onStop }: LiveListenerProps) {
  const [status, setStatus] = useState('🎙️ 正在监听...');
  const [translated, setTranslated] = useState<string[]>([]);
  const [listening, setListening] = useState(true);

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
    if (contextLines.length === 0) {
      enqueueSpeak('我没听清楚前面说了什么');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recentTexts: contextLines }),
      });

      const data = await res.json();
      const raw = data.summary ?? '';
      const cleaned = raw.replace(/^【?总结】?[:：]?\s*/i, '').trim();
      const final = cleaned.length < 4
        ? '他可能在表达一些请求或问题'
        : cleaned;

      enqueueSpeak(final);
    } catch (err) {
      enqueueSpeak('解释失败，请稍后重试');
    }
  };

  const translateAndSpeak = async (text: string) => {
    const lower = text.toLowerCase();
    const isJarvisTrigger = new RegExp(
      JARVIS_KEYWORDS.map(w => w.replace(/\s+/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
      'i'
    ).test(lower.replace(/\s+/g, ''));

    if (isJarvisTrigger) {
      await explainLastFewLines();
      return;
    }

    if (text.trim() && !policeHistory.current.includes(text.trim())) {
      policeHistory.current.push(text.trim());
      if (policeHistory.current.length > 10) policeHistory.current.shift();
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
        setTranslated(prev => [...prev, result.zh]);
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

      if (transcript?.trim()) handleTranscript(transcript);
    };

    ws.onerror = () => setStatus('❌ WebSocket 连接错误');
    ws.onclose = () => setStatus('🔌 连接断开');
  };

  const stop = () => {
    stopPCMStream();
    wsRef.current?.close();
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('🛑 识别已停止');
    if (onStop) onStop();
  };

  useEffect(() => {
    start();
    return () => stop();
  }, []);

  return (
    <div style={{ marginTop: 20 }}>
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
