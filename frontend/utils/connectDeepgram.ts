export async function connectToDeepgram(
  stream: MediaStream,
  onTranscript: (text: string) => void,
  deepgramKey: string
): Promise<() => void> {
  const socket = new WebSocket(
    `wss://api.deepgram.com/v1/listen?model=enhanced&encoding=linear16&sample_rate=16000`,
    ['token', deepgramKey]
  );

  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  socket.onopen = () => {
    console.log('✅ Deepgram WebSocket connected');
    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const int16 = float32ToInt16(input);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(int16);
      }
    };
  };

  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (transcript && transcript.length > 0) {
      console.log('📝 Transcript:', transcript);
      onTranscript(transcript);
    }
  };

  socket.onerror = (err) => {
    console.error('❌ WebSocket error:', err);
  };

  socket.onclose = () => {
    console.warn('🔌 Deepgram WebSocket closed');
  };

  // ✅ 返回清理函数，用于组件卸载时断开连接
  return () => {
    console.log('🛑 清理 Deepgram 音频处理链路');
    socket.close();
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach(track => track.stop());
    audioContext.close();
  };
}

function float32ToInt16(buffer: Float32Array): ArrayBuffer {
  const l = buffer.length;
  const result = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    result[i] = Math.max(-1, Math.min(1, buffer[i])) * 0x7fff;
  }
  return result.buffer;
}
