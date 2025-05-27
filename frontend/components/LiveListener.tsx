// frontend/components/Recorder.tsx

import React, { useEffect, useState } from 'react';
import { startMicStream } from '../utils/mic';

export default function Recorder() {
  const [status, setStatus] = useState('等待麦克风授权...');

  useEffect(() => {
    (async () => {
      try {
        const stream = await startMicStream();
        setStatus('🎙️ 麦克风已开启');
        console.log('🎧 Audio tracks:', stream.getAudioTracks());
        // TODO: 下一步是送入 Deepgram WebSocket
      } catch {
        setStatus('❌ 无法获取麦克风权限');
      }
    })();
  }, []);

  return <div>{status}</div>;
}
