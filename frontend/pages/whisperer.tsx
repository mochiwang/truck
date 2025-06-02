// frontend/pages/whisperer.tsx

'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import LiveListener from '../components/LiveListener';

export default function WhispererPage() {
  const router = useRouter();

  useEffect(() => {
    // 页面加载即开始识别逻辑：LiveListener 内部控制
    // 可在组件中实现 startRecognition()
  }, []);

  const handleStop = () => {
    // 这里可以通过自定义事件或直接在 LiveListener 中调用 stop
    router.push('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🧠 低语者 Whisperer</h1>
        <p style={styles.subtitle}>系统正在监听警察发言并实时翻译。</p>
      </div>

      <LiveListener onStop={handleStop} />

      <button style={styles.stopButton} onClick={handleStop}>
        ⏹️ 停止识别
      </button>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#0d0c0f',
    color: '#fff',
    minHeight: '100vh',
    padding: '2rem 1rem',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#ccc',
  },
  stopButton: {
    marginTop: '2rem',
    backgroundColor: '#ff5555',
    color: '#fff',
    fontSize: '1.1rem',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
};
