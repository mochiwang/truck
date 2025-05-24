import React, { useRef, useState } from 'react';

type Props = {
  onTranscribed: (blob: Blob) => void;
};

export default function Recorder({ onTranscribed }: Props) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'done'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const handleStart = async () => {
    setStatus('recording');
    chunks.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => chunks.current.push(e.data);

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setStatus('done');
        onTranscribed(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      alert('🎙️ 无法访问麦克风，请检查权限设置');
      setStatus('idle');
    }
  };

  const handleStop = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div>
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
        🎙️ 按住说话
      </button>

      <div style={{ marginTop: 10 }}>
        {status === 'idle' && '按住按钮开始录音，松开停止'}
        {status === 'recording' && '录音中…'}
        {status === 'done' && '录音完成 ✅'}
      </div>
    </div>
  );
}
