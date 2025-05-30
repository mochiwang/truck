let audioContext: AudioContext | null = null;

export async function startPCMStream(ws: WebSocket): Promise<AudioContext> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // ✅ 创建带 16kHz 采样率的 AudioContext
  audioContext = new AudioContext({ sampleRate: 16000 });

  // ✅ 加载 AudioWorkletProcessor 脚本（必须已存在 public/pcm-processor.js）
  await audioContext.audioWorklet.addModule('/pcm-processor.js');

  // ✅ 获取麦克风源并连接到 AudioWorkletNode
  const source = audioContext.createMediaStreamSource(stream);
  const pcmNode = new AudioWorkletNode(audioContext, 'pcm-processor');

  // ✅ 接收每一帧 Float32Array → 转换成 Int16 PCM → 发送给后端
  pcmNode.port.onmessage = (event) => {
    const float32 = event.data as Float32Array;
    const int16 = float32ToInt16(float32);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(int16.buffer);
    }
  };

  source.connect(pcmNode);
  pcmNode.connect(audioContext.destination); // 可去掉输出到扬声器的连接

  return audioContext;
}

export function stopPCMStream() {
  audioContext?.close();
  audioContext = null;
}

// ✅ Float32 [-1, 1] → Int16 [-32768, 32767]
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    int16[i] = Math.round(int16[i]);
  }
  return int16;
}
