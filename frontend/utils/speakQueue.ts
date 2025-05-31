// utils/speakQueue.ts

let isSpeaking = false;
const speakQueue: string[] = [];

export const enqueueSpeak = (text: string) => {
  speakQueue.push(text);
  processQueue();
};

function processQueue() {
  if (isSpeaking || speakQueue.length === 0) return;

  const nextText = speakQueue.shift();
  if (!nextText) return;

  const utter = new SpeechSynthesisUtterance(nextText);
  utter.lang = 'zh-CN';

  utter.onstart = () => {
    isSpeaking = true;
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
    processQueue(); // 尝试继续下一个
  };

  speechSynthesis.speak(utter);
}
