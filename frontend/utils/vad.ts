// utils/vad.ts

export function detectVoice(
  stream: MediaStream,
  onVoice: () => void,
  onSilence: () => void,
  silenceDelay = 2000 // ✅ 静音缓冲时间：2 秒
) {
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  const data = new Uint8Array(analyser.fftSize);
  let speaking = false;
  let silenceTimer: ReturnType<typeof setTimeout>;

  const loop = () => {
    analyser.getByteTimeDomainData(data);
    const rms = Math.sqrt(
      data.reduce((sum, val) => sum + (val - 128) ** 2, 0) / data.length
    );

    const threshold = 5; // 噪声门限，越小越敏感

    if (rms > threshold && !speaking) {
      speaking = true;
      onVoice();
      clearTimeout(silenceTimer);
    }

    if (rms <= threshold && speaking) {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        speaking = false;
        onSilence();
      }, silenceDelay);
    }

    requestAnimationFrame(loop);
  };

  loop();
}
