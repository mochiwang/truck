import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>🚛 卡车英语练习器</h1>
      <p style={{ fontSize: 18, marginBottom: 40 }}>请选择你要练习的内容：</p>

      <Link href="/fixed">
        <button style={buttonStyle}>🗂 固定句子训练</button>
      </Link>

      <Link href="/freeTalk">
        <button style={buttonStyle}>💬 自由输入练习（开发中）</button>
      </Link>

      <Link href="/scenario">
        <button style={buttonStyle}>🎙️ 场景式对话练习</button>
      </Link>

      <Link href="/sceneLoop">
        <button style={buttonStyle}>🎧 熟悉警察常用对话</button>
      </Link>

      <Link href="/scenarioChallenge">
        <button style={buttonStyle}>🧪 场景挑战（听→答）</button>
      </Link>

      <Link href="/whisperer">
        <button style={buttonStyle}>🧠 启动低语者（实时翻译）</button>
      </Link>

      <hr style={{ margin: '60px 0', border: '1px solid #ccc' }} />
      <p style={{ fontSize: 14, color: '#888' }}>
        👆 点击“低语者”进入后开始实时识别与翻译，适合在被拦车时使用。
      </p>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  display: 'block',
  width: 260,
  margin: '20px auto',
  padding: '14px 20px',
  fontSize: 16,
  backgroundColor: '#1976d2',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer'
};
