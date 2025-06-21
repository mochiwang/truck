import { convertFloat32ToInt16 } from './audioConverter';

// ────────────────────────────
// Audio streaming helpers  (蓝牙耳机 HFP/A2DP 兼容版)
// ────────────────────────────
let audioContext: AudioContext | null = null;
let micStream: MediaStream | null = null;
let micGain: GainNode;
let processor: ScriptProcessorNode;
let isStreaming = false; // gain=1 且 track.enabled=true 时为 true

/**
 * 一次性初始化麦克风流，首帧即静音 + 禁用 track
 * 后续通过 start / stop 切换 track.enabled 与 gain
 */
export async function initPCMStream(ws: WebSocket) {
  if (micStream) return; // 已初始化

  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext();

  const source = audioContext.createMediaStreamSource(micStream);
  micGain = audioContext.createGain();
  processor = audioContext.createScriptProcessor(4096, 1, 1);

  source.connect(micGain).connect(processor);
  processor.connect(audioContext.destination);

  processor.onaudioprocess = (e) => {
    if (!isStreaming) return; // 静音时不推流
    const pcm = convertFloat32ToInt16(e.inputBuffer.getChannelData(0));
    ws.send(pcm);
  };

  // 初始静音 & 挂起、禁用 Track → 耳机保持 A2DP
  micGain.gain.value = 0;
  micStream.getAudioTracks().forEach((t) => (t.enabled = false));
  await audioContext.suspend();
  isStreaming = false;
}

/**
 * 恢复推流：启用 Track + resume + gain=1
 */
export async function startPCMStream() {
  if (!audioContext || !micGain || !micStream) return;
  if (isStreaming) return;

  micStream.getAudioTracks().forEach((t) => (t.enabled = true));
  await audioContext.resume();
  micGain.gain.value = 1;
  isStreaming = true;
}

/**
 * 静音推流：gain=0 + suspend + 禁用 Track
 */
export async function stopPCMStream() {
  if (!audioContext || !micGain || !micStream) return;
  if (!isStreaming) return;

  micGain.gain.value = 0;
  await audioContext.suspend();
  micStream.getAudioTracks().forEach((t) => (t.enabled = false));
  isStreaming = false;
}
