import React, { useRef, useState } from 'react';

type Props = {
  onRecognized: (zhText: string) => void;
};

let cachedStream: MediaStream | null = null;

// ✅ 缓存麦克风流，只请求一次权限
async function getMicrophoneStream(): Promise<MediaStream> {
  if (cachedStream) return cachedStream;
  cachedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return cachedStream;
}

export default function RecorderZh({ onRecognized }: Props) {
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

      recorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
          const res = await fetch('/api/transcribe-zh', {
            method: 'POST',
            body: formData
          });

          const data = await res.json();
          onRecognized(data.text || '[识别失败]');
        } catch (err) {
          alert('转写失败，请稍后重试');
        }

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
          backgroundColor: status === 'recording' ? '#f44336' : '#388e3c',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        🎤 按住说中文
      </button>
      <div style={{ marginTop: 8 }}>
        {status === 'idle' && '按住按钮开始说话'}
        {status === 'recording' && '录音中…松开发送'}
        {status === 'done' && '✅ 识别完成'}
      </div>
    </div>
  );
}
