import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const WS_URL = process.env.NEXT_PUBLIC_WS_BACKEND!;

export default function PrepPage() {
  const router = useRouter();
  const [status, setStatus] = useState('⏳ 正在准备麦克风...');
  const [error, setError] = useState('');

  useEffect(() => {
    let ws: WebSocket | null = null;
    let stream: MediaStream | null = null;

    const prepare = async () => {
      try {
        setStatus('🎧 正在请求麦克风权限...');
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());

        setStatus('🌐 正在连接识别服务器...');
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          setStatus('✅ 系统准备就绪，正在进入...');
          setTimeout(() => {
            router.push('/whisperer');
          }, 500);
        };

        ws.onerror = () => {
          setError('❌ 无法连接识别服务器，请检查网络或稍后再试');
        };

        ws.onclose = () => {
          if (!error) {
            setError('❌ 识别服务连接已关闭');
          }
        };
      } catch (err) {
        console.error('⛔️ 麦克风获取失败:', err);
        setError('❌ 无法获取麦克风权限，请检查浏览器设置');
      }
    };

    prepare();

    return () => {
      ws?.close();
    };
  }, []);

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>正在准备...</h2>

      {error ? (
        <>
          <p style={styles.error}>{error}</p>
          <button onClick={handleBack} style={styles.button}>🔙 返回首页</button>
        </>
      ) : (
        <p style={styles.status}>{status}</p>
      )}
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    backgroundColor: '#0d0c0f',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  status: {
    fontSize: 18,
    color: '#ccc',
  },
  error: {
    fontSize: 18,
    color: '#ff5555',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  button: {
    padding: '10px 20px',
    fontSize: 16,
    backgroundColor: '#555',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
};
