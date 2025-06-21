import { pauseMic, resumeMic } from '../utils/startPCMStream';

let isSpeaking = false;
const speakQueue: string[] = [];
let lastSpokenText: string | null = null;
let currentAudio: HTMLAudioElement | null = null;

/** 将文本加入播报队列（如果与上次播报重复则跳过） */
export const enqueueSpeak = (text: string) => {
  if (text === lastSpokenText) {
    console.log('⚠️ 已播过相同内容，跳过:', text);
    return;
  }
  speakQueue.push(text);
  console.log('📥 入队:', text);
  processQueue();
};

/** 立即中断当前播报并插入新文本（强制播报） */
export const forceSpeak = (text: string) => {
  console.log('⛔️ 中断当前播报，插入:', text);
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  speakQueue.length = 0;
  isSpeaking = false;
  speakQueue.push(text);
  processQueue();
};

/** 核心流程：暂停麦 → 调 TTS → 播放 → 恢复麦 → 继续队列 */
async function processQueue() {
  if (isSpeaking || speakQueue.length === 0) return;

  const nextText = speakQueue.shift()!;
  lastSpokenText = nextText;
  isSpeaking     = true;
  console.log('🔊 播报开始:', nextText);

  try {
    /* 暂停麦克风（蓝牙耳机切到播放通道） */
    pauseMic();

    const res = await fetch(
      'https://speech-backend-2aut.onrender.com/api/tts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: nextText, lang: 'zh-CN' }),
      }
    );

    const { url } = await res.json();          // data:audio/mp3;base64,...
    currentAudio  = new Audio(url);

    currentAudio.onended = () => {
      console.log('✅ 播报完成');
      resumeMic();                             // 恢复麦克风
      isSpeaking  = false;
      currentAudio = null;
      processQueue();
    };

    currentAudio.onerror = (e) => {
      console.error('❌ 播放错误:', e);
      resumeMic();
      isSpeaking  = false;
      currentAudio = null;
      processQueue();
    };

    await currentAudio.play();
  } catch (err) {
    console.error('❌ 请求或播放失败:', err);
    resumeMic();
    isSpeaking = false;
    processQueue();
  }
}
