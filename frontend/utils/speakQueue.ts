// src/utils/speakQueue.ts  ·  Web Audio 播放 + WS keep‑alive ping
import { stopPCMStream, startPCMStream } from './audioStreamUtils';

/* ─── 1. AudioContext 单例 ───────────────────────────────────── */
export const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
let ctxUnlocked = false;

export async function unlockAudio() {
  if (ctxUnlocked) return;
  await ctx.resume();
  if (ctx.state === 'running') {
    // iOS ≤15 静音 0.05s 以彻底解锁
    const silent = ctx.createBuffer(1, 2205, 44100);
    const src = ctx.createBufferSource();
    src.buffer = silent;
    src.connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + 0.05);
    ctxUnlocked = true;
  }
}

/* ─── 2. 队列状态 ───────────────────────────────────────────── */
let isSpeaking = false;
const q: string[] = [];
let lastSpoken: string | null = null;

/* ─── 3. WebSocket keep‑alive (注入 getter) ─────────────────── */
let wsGetter: () => WebSocket | null = () => null;
export const setWsGetter = (fn: () => WebSocket | null) => { wsGetter = fn; };

let pingTimer: NodeJS.Timeout | null = null;
function startPing(interval = 3000) {
  stopPing();
  pingTimer = setInterval(() => {
    const ws = wsGetter();
    if (ws && ws.readyState === ws.OPEN) ws.send('{"type":"ping"}');
  }, interval);
}
function stopPing() {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
}

/* ─── 4. 对外 API ───────────────────────────────────────────── */
export const enqueueSpeak = (txt: string) => {
  if (txt === lastSpoken) return;
  q.push(txt);
  processQueue();
};
export const forceSpeak = (txt: string) => {
  q.length = 0;
  isSpeaking = false;
  q.push(txt);
  processQueue();
};

/* ─── 5. 主流程 ─────────────────────────────────────────────── */
async function processQueue() {
  if (isSpeaking || q.length === 0) return;

  const txt = q.shift()!;
  isSpeaking = true;
  lastSpoken = txt;

  await unlockAudio();
  await stopPCMStream();
  if (wsGetter()) startPing();          // 开启心跳

  try {
    const rsp = await fetch('https://speech-backend-2aut.onrender.com/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: txt, lang: 'zh-CN' }),
    });
    const { url } = await rsp.json();
    const buf = await (await fetch(url)).arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(buf);

    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);

    src.onended = async () => {
      stopPing();
      await startPCMStream();
      isSpeaking = false;
      processQueue();
    };

    src.start();
  } catch (err) {
    console.error('TTS 播放失败', err);
    stopPing();
    await startPCMStream();
    isSpeaking = false;
    processQueue();
  }
}
