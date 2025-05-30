// frontend/pages/whisperer.tsx

import React from 'react';
import LiveListener from '../components/LiveListener';

export default function WhispererPage() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>🧠 低语者 Whisperer</h1>
      <p style={{ fontSize: 18, marginBottom: 20 }}>
        当前模式下，系统将持续监听并翻译警察的讲话。
      </p>

      <LiveListener />

      <p style={{ fontSize: 14, marginTop: 12, color: '#888' }}>
        🗣️ 说英语试试看，系统会实时显示英文识别结果。
      </p>
    </div>
  );
}
