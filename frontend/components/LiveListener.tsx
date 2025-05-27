import React, { useEffect, useState } from 'react';
import { startMicStream } from '../utils/mic';
import { connectToDeepgram } from '../utils/connectDeepgram';

const DEEPGRAM_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_KEY!;

export default function LiveListener() {
  const [status, setStatus] = useState('等待麦克风授权...');
  const [lastText, setLastText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const stream = await startMicStream();
        setStatus('🎙️ 麦克风已开启');

        connectToDeepgram(stream, (text) => {
          setLastText(text); // 更新页面文字
        }, DEEPGRAM_KEY);
      } catch {
        setStatus('❌ 无法获取麦克风权限');
      }
    })();
  }, []);

  return (
    <div>
      <p>{status}</p>
      <p style={{ fontSize: 16, marginTop: 10 }}>📝 实时英文识别：{lastText}</p>
    </div>
  );
}
