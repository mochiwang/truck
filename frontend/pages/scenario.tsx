import React, { useState } from 'react';
import scenarioList from '../../data/scenarioList.json';
import Recorder from '../components/Recorder';

const API_BASE =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000/api'
    : 'https://truck-backend.vercel.app/api';

export default function ScenarioPractice() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [translated, setTranslated] = useState('');
  const [feedback, setFeedback] = useState('');

  const current = scenarioList[currentIndex];

  const playQuestion = () => {
    const utter = new SpeechSynthesisUtterance(current.en);
    utter.lang = 'en-US';
    speechSynthesis.speak(utter);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % scenarioList.length);
    setTranscription('');
    setTranslated('');
    setFeedback('');
  };

  const speak = (text: string, lang: string) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    speechSynthesis.speak(utter);
  };

  const handleUserResponse = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    const res = await fetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    const said = data.text || '[无识别结果]';
    setTranscription(said);

    // 粗略判断是否中文
    const isChinese = /[一-龥]/.test(said);

    if (isChinese) {
      const res2 = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: said })
      });
      const data2 = await res2.json();
      const english = data2.translation;
      setTranslated(english);
      speak(english, 'en-US'); // 播放翻译
    
      const res3 = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: current.en, actual: english })
      });
      const result = await res3.json();
      setFeedback(result.feedback || '[无反馈]');
    } else {
      const res4 = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: current.en, actual: said })
      });
      const result = await res4.json();
      setFeedback(result.feedback || '[无反馈]');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>🎙️ 场景式对话练习</h2>

      <div style={{ marginBottom: 12 }}>
        <strong>👮 角色：</strong> {current.role === 'police' ? '警察' : '司机'}<br />
        <strong>🧾 中文：</strong> {current.zh}<br />
        <strong>🗣️ 英文：</strong> {current.en}
      </div>

      <button onClick={playQuestion}>▶️ 播放场景语音</button>

      <div style={{ marginTop: 20 }}>
        <Recorder onTranscribed={handleUserResponse} />
      </div>

      {transcription && (
        <div style={{ marginTop: 20 }}>
          <strong>🗣️ 你说的是：</strong>
          <div style={{ color: 'blue' }}>{transcription}</div>
        </div>
      )}

      {translated && (
        <div style={{ marginTop: 10 }}>
          <strong>🌐 翻译为英文：</strong> {translated}
        </div>
      )}

      {feedback && (
        <div style={{ marginTop: 20 }}>
          <strong>🧠 反馈建议：</strong>
          <div style={{ whiteSpace: 'pre-wrap' }}>{feedback}</div>
        </div>
      )}

      <button onClick={handleNext} style={{ marginTop: 30 }}>➡️ 下一句</button>
    </div>
  );
}
