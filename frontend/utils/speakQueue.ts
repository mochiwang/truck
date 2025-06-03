let isSpeaking = false;
const speakQueue: string[] = [];
let lastSpokenText: string | null = null;

/**
 * 将文本加入播报队列（如果与上次播报重复则跳过）
 */
export const enqueueSpeak = (text: string) => {
  // 避免连续播相同内容（但允许内容重复出现在队列中不同位置）
  if (text === lastSpokenText) {
    console.log('⚠️ 已播过相同内容，跳过:', text);
    return;
  }

  speakQueue.push(text);
  console.log('📥 入队:', text);
  processQueue();
};

/**
 * 立即中断当前播报并插入新文本（强制播报）
 */
export const forceSpeak = (text: string) => {
  console.log('⛔️ 中断当前播报，插入:', text);
  speechSynthesis.cancel(); // 停止当前播报
  speakQueue.length = 0; // 清空队列
  speakQueue.push(text); // 加入新内容
  isSpeaking = false;
  processQueue(); // 立刻播放
};

function processQueue() {
  if (isSpeaking || speakQueue.length === 0) return;

  const nextText = speakQueue.shift();
  if (!nextText) return;

  const utter = new SpeechSynthesisUtterance(nextText);
  utter.lang = 'zh-CN';

  utter.onstart = () => {
    isSpeaking = true;
    lastSpokenText = nextText;
    console.log('🔊 播报开始:', nextText);
  };

  utter.onend = () => {
    isSpeaking = false;
    console.log('✅ 播报完成');
    processQueue(); // 🔁 播报下一个
  };

  utter.onerror = (e) => {
    isSpeaking = false;
    console.error('❌ 播报错误:', e);
    processQueue(); // 尝试继续
  };

  speechSynthesis.speak(utter);
}
