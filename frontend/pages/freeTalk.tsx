import React, { useState } from 'react';
import Recorder from '../components/Recorder';
import RecorderZh from '../components/RecorderZh';

export default function FreeTalk() {
  const [zhInput, setZhInput] = useState('');
  const [enOutput, setEnOutput] = useState('');
  const [transcription, setTranscription] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const translateToEnglish = async () => {
    if (!zhInput.trim()) return;
    setLoading(true);
    setTranscription('');
    setFeedback('');
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: zhInput })
      });
      const data = await res.json();
      setEnOutput(data.translation || '[翻译失败]');
    } catch (err) {
      alert('翻译出错');
    }
    setLoading(false);
  };

  const speakEnglish = () => {
    if (!enOutput) return;
    const utterance = new SpeechSynthesisUtterance(enOutput);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  const speakFeedback = () => {
    if (!feedback) return;
    const utterance = new SpeechSynthesisUtterance(feedback);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.95;
    speechSynthesis.speak(utterance);
  };

  const handleTranscription = async (blob: Blob) => {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');

    const res = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    const actual = data.text || '[无识别结果]';
    setTranscription(actual);

    if (actual && enOutput) {
      const res2 = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: enOutput,
          actual: actual
        })
      });
      const result = await res2.json();
      setFeedback(result.feedback || '[无反馈]');
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
      <h2>💬 自由输入练习</h2>
      <p>你可以说一句中文，我来帮你翻译，然后练习英文发音：</p>

      <RecorderZh onRecognized={(zh) => setZhInput(zh)} />

      <textarea
        rows={3}
        style={{ width: '100%', padding: 10, fontSize: 16, marginTop: 10 }}
        value={zhInput}
        onChange={(e) => setZhInput(e.target.value)}
        placeholder="比如：我刚从洛杉矶出发，正在去芝加哥"
      />
      <button onClick={translateToEnglish} disabled={loading} style={{ marginTop: 10 }}>
        🌐 翻译成英文
      </button>

      {enOutput && (
        <div style={{ marginTop: 20 }}>
          <strong>英文结果：</strong>
          <div>{enOutput}</div>
          <button onClick={speakEnglish} style={{ marginTop: 10 }}>
            ▶️ 播放英文发音
          </button>
        </div>
      )}

      {enOutput && (
        <div style={{ marginTop: 20 }}>
          <Recorder onTranscribed={handleTranscription} />
        </div>
      )}

      {transcription && (
        <div style={{ marginTop: 20 }}>
          <strong>🗣️ 你说的是：</strong>
          <div style={{ color: 'blue' }}>{transcription}</div>
        </div>
      )}

      {feedback && (
        <div style={{ marginTop: 20 }}>
          <strong>🧠 中文反馈：</strong>
          <div style={{ whiteSpace: 'pre-wrap' }}>{feedback}</div>
          <button onClick={speakFeedback} style={{ marginTop: 10 }}>
            🔊 播放反馈语音
          </button>
        </div>
      )}
    </div>
  );
}
