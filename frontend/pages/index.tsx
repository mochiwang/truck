// frontend/pages/index.tsx

import React from 'react';
import Link from 'next/link';
import LiveListener from '../components/LiveListener'; // 低语者监听器组件

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

      {/* 分割线 */}
      <hr style={{ margin: '60px 0', border: '1px solid #ccc' }} />

      <h2>🧠 低语者 Whisperer（MVP 模式）</h2>
      <p style={{ marginBottom: 20 }}>
        本系统会自动监听警察说话，并在耳机中低语中文翻译。<br />
        当前测试麦克风是否成功启动。
      </p>

      {/* ✅ 启动麦克风监听 */}
      <LiveListener />

      <p style={{ fontSize: 14, marginTop: 12, color: '#888' }}>
        👆 如果你看到“🎙️ 麦克风已开启”，说明监听成功。打开控制台查看更多详情。
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
