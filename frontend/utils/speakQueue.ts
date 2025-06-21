// src/utils/speakQueue.ts
import { stopPCMStream, startPCMStream } from './audioStreamUtils';

/* ──────────────────────────────────────────
   1.  全局 AudioContext（一次 resume → 永久激活）
────────────────────────────────────────── */
export const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
let ctxUnlocked = false;

/** 在真实用户手势中调用，解锁 AudioContext */
export async function unlockAudio() {
  if (ctxUnlocked) return;
  try {
    await ctx.resume();
    // iOS ≤15 需要播放一次极短静音才能彻底解锁
    if (ctx.state === 'running') {
      const silent = ctx.createBuffer(1, 2205, 44100);        // 0.05 s 静音
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
      src.stop(ctx.currentTime + 0.05);
      ctxUnlocked = true;
    }
  } catch {/* ignore */}
}

/* ──────────────────────────────────────────
   2. 队列状态
────────────────────────────────────────── */
let isSpeaking = false;
const q: string[] = [];
let lastSpoken: string | null = null;

/* ──────────────────────────────────────────
   3. 对外 API
────────────────────────────────────────── */
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

/* ──────────────────────────────────────────
   4. 主流程：静音 → 拉取 MP3 → 解码 → 播放 → 恢复麦
────────────────────────────────────────── */
async function processQueue() {
  if (isSpeaking || q.length === 0) return;

  const txt = q.shift()!;
  isSpeaking = true;
  lastSpoken = txt;

  // 4-1 先解锁（若尚未成功）
  await unlockAudio();

  // 4-2 静音麦克风
  await stopPCMStream();

  try {
    // 4-3 获取 & 解码 MP3
    const rsp = await fetch('https://speech-backend-2aut.onrender.com/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: txt, lang: 'zh-CN' }),
    });
    const { url } = await rsp.json();
    const bufArray = await (await fetch(url)).arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(bufArray);

    // 4-4 播放
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);

    src.onended = async () => {
      await startPCMStream();    // 恢复麦克风
      isSpeaking = false;
      processQueue();
    };

    src.start();                 // 立即播放
  } catch (err) {
    console.error('TTS 播放失败', err);
    await startPCMStream();
    isSpeaking = false;
    processQueue();
  }
}
