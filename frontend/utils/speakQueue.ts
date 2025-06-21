import {
  stopPCMStream,
  startPCMStream
} from '../utils/startPCMStream';

/** 外部把当前 WebSocket 传进来，播报结束时重新 startPCMStream */
let getWs: () => WebSocket | null = () => null;
export const setWsGetter = (fn: () => WebSocket | null) => { getWs = fn; };

/* ───────── 队列状态 ───────── */
let isSpeaking = false;
const speakQueue: string[] = [];
let lastSpokenText: string | null = null;
let currentAudio: HTMLAudioElement | null = null;

/** 入队（跳过连续相同内容） */
export const enqueueSpeak = (text: string) => {
  if (text === lastSpokenText) {
    console.log('⚠️ 已播过相同内容，跳过:', text);
    return;
  }
  speakQueue.push(text);
  console.log('📥 入队:', text);
  processQueue();
};

/** 强制打断当前播报并插入新文本 */
export const forceSpeak = (text: string) => {
  console.log('⛔️ 强制播报:', text);
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  speakQueue.length = 0;
  isSpeaking = false;
  speakQueue.push(text);
  processQueue();
};

/** 主流程：stopMic → fetch TTS → 播放 → startMic → 递归 */
async function processQueue() {
  if (isSpeaking || speakQueue.length === 0) return;

  const text = speakQueue.shift()!;
  lastSpokenText = text;
  isSpeaking     = true;
  console.log('🔊 播报开始:', text);

  /* ① 完全关闭麦克风流，释放 A2DP 通道 */
  stopPCMStream();

  try {
    const res = await fetch(
      'https://speech-backend-2aut.onrender.com/api/tts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: 'zh-CN' }),
      }
    );
    const { url } = await res.json();          // data:audio/mp3;base64,...
    currentAudio  = new Audio(url);

    const resumeMic = async () => {
      const ws = getWs();
      if (ws) await startPCMStream(ws);         // ② 播完后重开麦克风流
      isSpeaking  = false;
      currentAudio = null;
      processQueue();
    };

    currentAudio.onended = resumeMic;
    currentAudio.onerror = (e) => {
      console.error('❌ 播放错误:', e);
      resumeMic();
    };

    await currentAudio.play();
  } catch (err) {
    console.error('❌ 请求或播放失败:', err);
    const ws = getWs();
    if (ws) await startPCMStream(ws);           // 失败也要恢复麦克风
    isSpeaking = false;
    processQueue();
  }
}
