import React, { useState } from 'react';
import Recorder from '../components/Recorder';
import sentenceList from '../../data/scenarioList.json';

const API_BASE =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/api'
    : 'https://truck-backend.vercel.app/api';

export default function FixedPractice() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [feedback, setFeedback] = useState('');
  const current = sentenceList[currentIndex];

  const handleNext = () => {
    setTranscription('');
    setFeedback('');
    setCurrentIndex((prev) => (prev + 1) % sentenceList.length);
  };

  const playAudio = () => {
    const utterance = new SpeechSynthesisUtterance(current.en);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  const speakFeedback = () => {
    if (!feedback) return;

    // 中文反馈播报
    const utterZh = new SpeechSynthesisUtterance(feedback);
    utterZh.lang = 'zh-CN';
    utterZh.rate = 0.95;
    speechSynthesis.speak(utterZh);

    // 自动提取最后的“跟我一起说一遍”英文内容
    const match = feedback.match(/跟我.*?说一遍[:：\s]*["“”]?(.+?)["“”]?[，。！？]?$/i);
    const repeatEn = match?.[1];

    if (repeatEn) {
      const utterEn = new SpeechSynthesisUtterance(repeatEn);
      utterEn.lang = 'en-US';
      utterEn.rate = 1;
      speechSynthesis.speak(utterEn);
    }
  };

  const handleTranscription = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    const res = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    const actual = data.text?.trim() || '';
    setTranscription(actual || '[无识别结果]');

    if (actual && actual !== '[无识别结果]' && current.en) {
      const res2 = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: current.en,
          actual: actual,
        }),
      });

      const result = await res2.json();
      setFeedback(result.feedback || '[无反馈]');
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
      <h2>🚛 固定句子训练</h2>

      <div style={{ marginBottom: 20, fontSize: 18 }}>
        <strong>📘 中文：</strong> {current.zh}<br />
        <strong>📝 英文：</strong> {current.en}
      </div>

      <button onClick={playAudio}>▶️ 播放标准发音</button>

      <div style={{ marginTop: 20 }}>
        <Recorder onTranscribed={handleTranscription} />
      </div>

      {transcription && (
        <div style={{ marginTop: 20 }}>
          <strong>🗣️ 你说的是：</strong>
          <div style={{ color: 'blue', fontSize: 16 }}>{transcription}</div>
        </div>
      )}

      {feedback && (
        <div style={{ marginTop: 20 }}>
          <strong>🧠 反馈建议：</strong>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{feedback}</div>
          <button onClick={speakFeedback} style={{ marginTop: 10 }}>🔊 播放反馈与跟读</button>
        </div>
      )}

      <button onClick={handleNext} style={{ marginTop: 30 }}>➡️ 下一句</button>
    </div>
  );
}
