// utils/startPCMStream.ts
let audioContext: AudioContext | null = null;
let localStream: MediaStream | null   = null;   // ⬅️ 记录麦克风流，方便暂停/恢复

export async function startPCMStream(ws: WebSocket): Promise<AudioContext> {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // 创建 16 kHz 的 AudioContext
  audioContext = new AudioContext({ sampleRate: 16000 });

  // 加载 AudioWorkletProcessor（确保 public/pcm-processor.js 已存在）
  await audioContext.audioWorklet.addModule('/pcm-processor.js');

  // 将麦克风流接入 Worklet
  const source  = audioContext.createMediaStreamSource(localStream);
  const pcmNode = new AudioWorkletNode(audioContext, 'pcm-processor');

  pcmNode.port.onmessage = (event) => {
    const float32 = event.data as Float32Array;
    const int16   = float32ToInt16(float32);
    if (ws.readyState === WebSocket.OPEN) ws.send(int16.buffer);
  };

  source.connect(pcmNode);
  pcmNode.connect(audioContext.destination); // 如不想回放可移除

  return audioContext;
}

export function stopPCMStream() {
  audioContext?.close();
  audioContext = null;
  localStream?.getTracks().forEach(t => t.stop());
  localStream = null;
}

/* ⬇️  新增：仅禁用/启用麦克风 track，不断开 WebSocket */
export function pauseMic() {
  localStream?.getAudioTracks().forEach(t => (t.enabled = false));
}

export function resumeMic() {
  localStream?.getAudioTracks().forEach(t => (t.enabled = true));
}

// Float32 [-1, 1] → Int16 [-32768, 32767]
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = Math.round(s < 0 ? s * 0x8000 : s * 0x7FFF);
  }
  return int16;
}
