import { stopPCMStream, startPCMStream } from './audioStreamUtils';

/* ------------------------------------------------------------------
   speakQueue.ts  ·  复用单例 <audio> 元素，解决浏览器自动播放拦截
-------------------------------------------------------------------*/

// 🅰️ 单例 Audio 元素（在首次用户手势中 unlock）
const audioEl = new Audio();
audioEl.preload = 'auto';
audioEl.crossOrigin = 'anonymous';
let audioUnlocked = false; // 解锁状态

// 若需要，可在按钮点击里 export 解锁函数调用
export async function unlockAudio() {
  if (audioUnlocked) return;
  try {
    // 播放极短静音（Base64 编码的 0.1s mp3）
    audioEl.src = 'data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAAMEBBAABAgMAAgACAgICAgICAgICAgP//AAA=';
    await audioEl.play();
    audioUnlocked = true;
  } catch {
    /* 若用户还未手势，浏览器会拒绝；下次按钮点击再尝试 */
  }
}

/* ---------- 可选：保留空实现避免旧代码报错 ---------- */
let getWs: () => WebSocket | null = () => null;
export const setWsGetter = (fn: () => WebSocket | null) => { getWs = fn; };

/* ---------- 队列状态 ---------- */
let isSpeaking = false;
const speakQueue: string[] = [];
let lastSpokenText: string | null = null;

/* ---------- 公开 API ---------- */
export const enqueueSpeak = (text: string) => {
  if (text === lastSpokenText) return;
  speakQueue.push(text);
  processQueue();
};

export const forceSpeak = (text: string) => {
  speakQueue.length = 0;
  isSpeaking = false;
  speakQueue.push(text);
  processQueue();
};

/* ---------- 主流程：静音 → 获取 TTS → 播放 → 恢复麦克 ---------- */
async function processQueue() {
  if (isSpeaking || speakQueue.length === 0) return;

  const txt = speakQueue.shift()!;
  isSpeaking = true;
  lastSpokenText = txt;

  // 若未解锁，尝试解锁（需在用户手势链中才能成功）
  await unlockAudio();

  // ⏹️ 静音麦克风流
  await stopPCMStream();

  try {
    const res = await fetch('https://speech-backend-2aut.onrender.com/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: txt, lang: 'zh-CN' }),
    });
    const { url } = await res.json();

    const resumeMic = async () => {
      await startPCMStream(); // 🔊 恢复麦克风推流
      isSpeaking = false;
      processQueue();
    };

    audioEl.onended = resumeMic;
    audioEl.onerror = resumeMic;

    audioEl.src = url;       // 复用元素，不再 new
    await audioEl.play();    // 若解锁成功，浏览器不再拦截
  } catch (err) {
    console.error('TTS 播放失败:', err);
    await startPCMStream();
    isSpeaking = false;
    processQueue();
  }
}
