import React, { useEffect, useState } from 'react';
import { startMicStream } from '../utils/mic';
import { connectToDeepgram } from '../utils/connectDeepgram';

const DEEPGRAM_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_KEY!;

export default function LiveListener() {
  const [status, setStatus] = useState('等待麦克风授权...');
  const [log, setLog] = useState<string[]>([]); // 英文实时记录
  const [translated, setTranslated] = useState<string[]>([]); // 中文翻译记录

  useEffect(() => {
    let cleanup: () => void;

    (async () => {
      try {
        const stream = await startMicStream();
        setStatus('🎙️ 麦克风已开启');
        console.log('🎧 Microphone stream started');

        cleanup = await connectToDeepgram(
          stream,
          async (text) => {
            if (!text.trim()) return;

            console.log('📝 Transcript:', text);
            setLog((prev) => [...prev, text]);

            try {
              // ✅ 使用 Whisperer 专属翻译接口
              const res = await fetch('/api/translateWhisperer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
              });

              const result = await res.json();

              if (result?.zh) {
                console.log('🌐 翻译结果:', result.zh);
                setTranslated((prev) => [...prev, result.zh]);

                // 🗣️ 中文播报
                const utter = new SpeechSynthesisUtterance(result.zh);
                utter.lang = 'zh-CN';
                speechSynthesis.speak(utter);
              }
            } catch (err) {
              console.error('❌ 翻译失败:', err);
            }
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
          background: '#f0f0f0',
          border: '1px solid #ccc',
          borderRadius: 6,
          width: '80%',
          maxWidth: 600,
          margin: '0 auto',
          textAlign: 'left',
          fontSize: 16,
          minHeight: 100,
          whiteSpace: 'pre-line',
        }}
      >
        <strong>英文识别：</strong>
        {log.length === 0 ? '🕰️ 正在等待语音输入…' : log.join('\n')}
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 16,
          background: '#fdfdfd',
          border: '1px solid #ddd',
          borderRadius: 6,
          width: '80%',
          maxWidth: 600,
          margin: '12px auto 0',
          textAlign: 'left',
          fontSize: 16,
          minHeight: 100,
          whiteSpace: 'pre-line',
        }}
      >
        <strong>中文翻译：</strong>
        {translated.length === 0 ? '🈳 正在准备翻译…' : translated.join('\n')}
      </div>
    </div>
  );
}
