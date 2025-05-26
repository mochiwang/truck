import React, { useEffect, useState, useRef } from 'react';
import scenarioList from '../../data/sentenceList.json';

export default function SceneLoop() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const current = scenarioList[currentIndex];

  const play = () => {
    if (!current) return;
    setIsPlaying(true);

    // 播放英文
    const enUtter = new SpeechSynthesisUtterance(current.en);
    enUtter.lang = 'en-US';
    enUtter.onend = () => {
      // 播放中文
      const zhUtter = new SpeechSynthesisUtterance(current.zh);
      zhUtter.lang = 'zh-CN';
      zhUtter.onend = () => {
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % scenarioList.length);
        }, 800); // 自动下一句
      };
      speechSynthesis.speak(zhUtter);
      utterRef.current = zhUtter;
    };
    speechSynthesis.speak(enUtter);
    utterRef.current = enUtter;
  };

  useEffect(() => {
    if (isPlaying) {
      play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, isPlaying]);

  const stop = () => {
    setIsPlaying(false);
    speechSynthesis.cancel();
  };

  const replay = () => {
    stop();
    setTimeout(play, 200);
  };

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>🎧 熟悉警察常用对话</h2>

      <div style={{ marginBottom: 20 }}>
        <strong>👮 当前角色：</strong> {current.role === 'police' ? '警察' : '司机'}<br />
        <strong>🗣️ 英文：</strong> {current.en}<br />
        <strong>📘 中文：</strong> {current.zh}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={() => setIsPlaying(true)} disabled={isPlaying}>▶️ 播放</button>
        <button onClick={stop} disabled={!isPlaying}>⏸️ 暂停</button>
        <button onClick={replay}>🔁 重听</button>
        <button onClick={() => {
          stop();
          setCurrentIndex((prev) => (prev + 1) % scenarioList.length);
        }}>⏭️ 下一句</button>
      </div>
    </div>
  );
}
