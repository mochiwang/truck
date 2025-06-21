import {
  stopPCMStream,
  startPCMStream
} from '../utils/startPCMStream';

/* ---------- ① 让 LiveListener 把当前 WebSocket 引进来 ---------- */
let getWs: () => WebSocket | null = () => null;
export const setWsGetter = (fn: () => WebSocket | null) => { getWs = fn; };

/* ---------- ② 创建一个隐藏按钮，用来触发二次 getUserMedia ---------- */
const hiddenBtn = document.createElement('button');
hiddenBtn.style.display = 'none';
document.body.appendChild(hiddenBtn);

/* 点击隐藏按钮 = Safari 认可的用户手势，里面重新开麦 */
hiddenBtn.addEventListener('click', async () => {
  const ws = getWs();
  if (ws) await startPCMStream(ws);
  console.log('🎤 麦克风已重新启动（通过隐藏按钮）');
});

/* ---------- ③ 队列状态 ---------- */
let isSpeaking = false;
const speakQueue: string[] = [];
let lastSpokenText: string | null = null;
let currentAudio: HTMLAudioElement | null = null;

/* ---------- ④ 队列 API ---------- */
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

/* ---------- ⑤ 主流程：stop → fetch → play → hiddenBtn.click() → 继续 ---------- */
async function processQueue() {
  if (isSpeaking || speakQueue.length === 0) return;

  const txt = speakQueue.shift()!;
  isSpeaking = true;
  lastSpokenText = txt;

  /* ⏹️  先彻底停止麦克风流，让蓝牙耳机切到 A2DP 立体声 */
  stopPCMStream();

  try {
    const res = await fetch('https://speech-backend-2aut.onrender.com/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: txt, lang: 'zh-CN' }),
    });
    const { url } = await res.json();
    currentAudio = new Audio(url);

    /* 封装恢复麦克风的逻辑（隐藏按钮 click 即可） */
    const resumeMic = () => {
      hiddenBtn.click();            // Safari 认为“有用户手势” → getUserMedia OK
      isSpeaking  = false;
      currentAudio = null;
      processQueue();
    };

    currentAudio.onended = resumeMic;
    currentAudio.onerror = resumeMic;

    await currentAudio.play();
  } catch (err) {
    console.error('TTS 播放失败:', err);
    hiddenBtn.click();              // 出错也要恢复麦克风
    isSpeaking = false;
    processQueue();
  }
}
