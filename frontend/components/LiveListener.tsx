// src/screens/LiveListener.tsx  ·  修复 Jarvis 触发停译 + 减少去抖延迟 1000→300
import React, { useEffect, useRef, useState } from 'react';
import { initPCMStream, startPCMStream, stopPCMStream } from '../utils/audioStreamUtils';
import { enqueueSpeak, unlockAudio } from '../utils/speakQueue';

const WS_URL = process.env.NEXT_PUBLIC_WS_BACKEND!;
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://truck-backend.vercel.app');

const JARVIS_KEYWORDS = [
  'jarvis','贾维斯','假维斯','家务事','jiaweis','jia vis',
  'javis','java s','service','jervis','jer vis','杰维斯',
  '加我说','叫我说','家里事','驾驶',
];

const DEBOUNCE_MS = 300; // ⏱️ 说话稳定延迟

type LiveListenerProps = { onStop?: () => void };

export default function LiveListener({ onStop }: LiveListenerProps) {
  /* ---------- 状态 & ref ---------- */
  const [status, setStatus]         = useState('🎙️ 正在识别中...');
  const [translated, setTranslated] = useState<string[]>([]);

  const wsRef            = useRef<WebSocket | null>(null);
  const lastTranslated   = useRef<string | null>(null);
  const policeHistory    = useRef<string[]>([]);
  const timeoutRef       = useRef<NodeJS.Timeout | null>(null);
  const stableTranscript = useRef('');
  const prevTranscript   = useRef<string | null>(null);

  /* ---------- 识别文本去抖 ---------- */
  const handleTranscript = (incoming: string) => {
    if (incoming !== stableTranscript.current) {
      stableTranscript.current = incoming;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (stableTranscript.current === prevTranscript.current) return;
        prevTranscript.current = stableTranscript.current;
        translateAndSpeak(stableTranscript.current);
      }, DEBOUNCE_MS);
    }
  };

  /* ---------- Jarvis 说明 ---------- */
  const explainLastFewLines = async () => {
    const ctxLines = policeHistory.current.slice(-3);
    if (!ctxLines.length) return enqueueSpeak('我没听清楚前面说了什么');

    try {
      const res  = await fetch(`${API_BASE}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recentTexts: ctxLines }),
      });
      const data   = await res.json();
      const raw    = data.summary ?? '';
      const cleaned = raw.replace(/^【?总结】?[:：]?\s*/i, '').trim();
      enqueueSpeak(cleaned.length < 4 ? '他可能在表达一些请求或问题' : cleaned);
    } catch {
      enqueueSpeak('解释失败，请稍后重试');
    }
  };

  /* ---------- 翻译 & TTS ---------- */
  const translateAndSpeak = async (text: string) => {
    const keywordRegex = new RegExp(
      JARVIS_KEYWORDS.map(w => w.replace(/\s+/g,'').replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')).join('|'),
      'i'
    );
    const isJarvis = keywordRegex.test(text.toLowerCase().replace(/\s+/g,''));

    if (isJarvis) {
      // ✨ 清空去抖缓存，避免后续翻译卡死
      stableTranscript.current = '';
      prevTranscript.current   = null;
      return explainLastFewLines();
    }

    // 记录警察原声
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
      const { zh } = await res.json();
      if (zh && zh !== lastTranslated.current) {
        lastTranslated.current = zh;
        setTranslated(p => [...p, zh]);
        enqueueSpeak(zh);
      }
    } catch {/* ignore */}
  };

  /* ---------- WebSocket & Mic 生命周期 ---------- */
  const start = async () => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = async () => {
      setStatus('🎙️ 麦克风已开启，识别中...');
      await initPCMStream(ws);
      startPCMStream();
    };

    ws.onmessage = (e) => {
      let transcript = '';
      try {
        const payload = JSON.parse(e.data);
        if (payload.transcript) transcript = payload.transcript;
      } catch { transcript = e.data; }
      if (transcript.trim()) handleTranscript(transcript);
    };

    ws.onerror = ()  => setStatus('❌ WebSocket 连接错误');
    ws.onclose = () => setStatus('🔌 连接断开');
  };

  const stop = () => {
    stopPCMStream();
    wsRef.current?.close();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus('🛑 识别已停止');
    onStop?.();
  };

  /* ---------- 初始化 & 清理 ---------- */
  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- UI ---------- */
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', color:'white' }}>
      <p style={{ marginTop:10, fontSize:18, color:'#ccc' }}>{status}</p>

      <div style={{
        width:200, height:200, borderRadius:'50%',
        backgroundImage:'url(/assets/whisperer-circle.png)',
        backgroundSize:'cover', backgroundPosition:'center',
        marginTop:20, marginBottom:30, boxShadow:'0 0 60px 15px rgba(255,100,0,0.4)'
      }} />

      <button onClick={stop} style={{
        backgroundColor:'#f44336', color:'#fff', padding:'12px 24px',
        borderRadius:12, border:'none', fontSize:18, fontWeight:'bold', marginBottom:10, cursor:'pointer',
      }}>
        ⏹️ 停止识别
      </button>

      <button onClick={async () => { await unlockAudio(); enqueueSpeak('这是一条测试语音'); }} style={{
        backgroundColor:'#2196f3', color:'#fff', padding:'10px 20px',
        borderRadius:10, border:'none', fontSize:16, marginBottom:30, cursor:'pointer',
      }}>
        🔈 播放测试语音
      </button>

      <div style={{
        backgroundColor:'#222', borderRadius:12, padding:'16px 24px',
        maxWidth:600, width:'90%', fontSize:16, color:'#eee', whiteSpace:'pre-line',
      }}>
        {translated.length === 0 ? '⏳ 正在准备翻译...' : translated.join('\n')}
      </div>

      <p style={{ fontSize:13, marginTop:20, color:'#888' }}>
        继续对话吧，系统会实时翻译和播报。
      </p>
    </div>
  );
}
