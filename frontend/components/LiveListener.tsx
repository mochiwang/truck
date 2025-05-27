import React, { useEffect, useState } from 'react';
import { startMicStream } from '../utils/mic';
import { connectToDeepgram } from '../utils/connectDeepgram';

const DEEPGRAM_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_KEY!;

export default function LiveListener() {
  const [status, setStatus] = useState('等待麦克风授权...');
  const [log, setLog] = useState<string[]>([]); // 实时转写记录

  useEffect(() => {
    let cleanup: () => void; // 清理函数用于断开连接

    (async () => {
      try {
        const stream = await startMicStream();
        setStatus('🎙️ 麦克风已开启');
        console.log('🎧 Microphone stream started');

        // ✅ 启动 Deepgram 识别，并获取关闭函数
        cleanup = await connectToDeepgram(
          stream,
          (text) => {
            console.log('📝 Transcript:', text);
            setLog((prev) => [...prev, text]); // 追加识别结果
          },
          DEEPGRAM_KEY
        );
      } catch (err) {
        console.error('❌ 获取麦克风失败:', err);
        setStatus('❌ 无法获取麦克风权限');
      }
    })();

    return () => {
      if (cleanup) {
        console.log('🧹 页面卸载，断开 Deepgram 和麦克风');
        cleanup();
      }
    };
  }, []);

  return (
    <div style={{ marginTop: 20 }}>
      <p>{status}</p>
      <div
        style={{
          marginTop: 12,
          padding: 16,
          background: '#f4f4f4',
          border: '1px solid #ccc',
          borderRadius: 6,
          width: '80%',
          maxWidth: 600,
          marginLeft: 'auto',
          marginRight: 'auto',
          textAlign: 'left',
          fontSize: 16,
          minHeight: 100,
          whiteSpace: 'pre-line'
        }}
      >
        {log.length === 0 ? '🕰️ 正在等待语音输入…' : log.join('\n')}
      </div>
    </div>
  );
}
