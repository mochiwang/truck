import React from 'react';
import { useRouter } from 'next/router';

export default function PermissionDeniedPage() {
  const router = useRouter();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>⚠️ 无法访问麦克风</h1>
      <p style={styles.subtitle}>
        我们需要使用麦克风才能进行语音识别，请按照以下方法启用权限。
      </p>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>💻 如果你在电脑上：</h2>
        <ul style={styles.list}>
          <li>点击浏览器地址栏左侧的 🔒 小锁图标</li>
          <li>找到“麦克风”权限</li>
          <li>选择“允许”，然后刷新页面</li>
        </ul>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>📱 如果你在手机上：</h2>
        <ul style={styles.list}>
          <li>打开手机“设置”</li>
          <li>进入 Safari 或 Chrome 设置</li>
          <li>找到“麦克风”权限，启用它</li>
          <li>返回浏览器并刷新页面</li>
        </ul>
      </div>

      <button style={styles.button} onClick={() => router.push('/')}>
        ⬅ 返回首页重新尝试
      </button>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#0d0c0f',
    color: 'white',
    minHeight: '100vh',
    padding: '40px 20px',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  title: {
    fontSize: '2rem',
    marginBottom: 20,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '1.1rem',
    marginBottom: 30,
    maxWidth: 600,
    textAlign: 'center' as const,
  },
  sectionTitle: {
    fontSize: '1.2rem',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#222',
    padding: '20px 30px',
    borderRadius: 12,
    marginBottom: 30,
    maxWidth: 500,
    width: '100%',
  },
  list: {
    lineHeight: 1.6,
    fontSize: '1rem',
    paddingLeft: 20,
  },
  button: {
    backgroundColor: '#1976d2',
    border: 'none',
    padding: '12px 20px',
    color: 'white',
    fontSize: '1rem',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 20,
  },
};
