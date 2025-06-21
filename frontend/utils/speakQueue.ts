import {
  stopPCMStream,
  startPCMStream,
} from './audioStreamUtils';

/* ---------- 可选：保留空实现的 setWsGetter，避免旧代码报错 ---------- */
let getWs: () => WebSocket | null = () => null;
export const setWsGetter = (fn: () => WebSocket | null) => {
  getWs = fn;
};

/* ---------- 队列状态 ---------- */
let isSpeaking = false;
const speakQueue: string[] = [];
let lastSpokenText: string | null = null;
let currentAudio: HTMLAudioElement | null = null;

/* ---------- 公开 API ---------- */
export const enqueueSpeak = (text: string) => {
  if (text === lastSpokenText) return;
  speakQueue.push(text);
  processQueue();
};

export const forceSpeak = (text: string) => {
  if (currentAudio) currentAudio.pause();
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

  // ⏹️ 先静音麦克风流
  stopPCMStream();

  try {
    const res = await fetch('https://speech-backend-2aut.onrender.com/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: txt, lang: 'zh-CN' }),
    });
    const { url } = await res.json();
    currentAudio = new Audio(url);

    const resumeMic = () => {
      startPCMStream(); // 🔊 恢复麦克风推流
      isSpeaking = false;
      currentAudio = null;
      processQueue();
    };

    currentAudio.onended = resumeMic;
    currentAudio.onerror = resumeMic;

    await currentAudio.play();
  } catch (err) {
    console.error('TTS 播放失败:', err);
    startPCMStream(); // 确保麦克风恢复
    isSpeaking = false;
    processQueue();
  }
}
