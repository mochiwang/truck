import React, { useRef, useState } from 'react';

type Props = {
  onTranscribed: (blob: Blob) => void;
};

let cachedStream: MediaStream | null = null;

// ✅ 封装麦克风权限缓存机制
async function getMicrophoneStream(): Promise<MediaStream> {
  if (cachedStream) return cachedStream;
  cachedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return cachedStream;
}

export default function Recorder({ onTranscribed }: Props) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'done'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const handleStart = async () => {
    setStatus('recording');
    chunks.current = [];

    try {
      const stream = await getMicrophoneStream();
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        onTranscribed(blob);
        setStatus('done');
      };

      recorder.start();
    } catch (err) {
      alert('🎙️ 无法访问麦克风，请检查浏览器权限设置');
      setStatus('idle');
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onMouseDown={handleStart}
        onMouseUp={handleStop}
        onTouchStart={handleStart}
        onTouchEnd={handleStop}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: status === 'recording' ? '#f44336' : '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        🎤 按住朗读英文
      </button>
      <div style={{ marginTop: 8 }}>
        {status === 'idle' && '准备好了，按住朗读'}
        {status === 'recording' && '录音中…松开发送'}
        {status === 'done' && '✅ 发送完成'}
      </div>
    </div>
  );
}
