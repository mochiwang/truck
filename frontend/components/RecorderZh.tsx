// frontend/components/RecorderZh.tsx
import React, { useRef, useState } from 'react';

type Props = {
  onRecognized: (zhText: string) => void;
};

export default function RecorderZh({ onRecognized }: Props) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'done'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const handleStart = async () => {
    setStatus('recording');
    chunks.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => chunks.current.push(e.data);

      recorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        const res = await fetch('/api/transcribe-zh', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        onRecognized(data.text || '[识别失败]');
        setStatus('done');
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
    } catch (err) {
      alert('🎙️ 无法访问麦克风，请检查权限设置');
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
      <div style={{ marginTop: 10 }}>
        {status === 'idle' && '按住按钮开始说话'}
        {status === 'recording' && '录音中…'}
        {status === 'done' && '识别完成 ✅'}
      </div>
    </div>
  );
}
