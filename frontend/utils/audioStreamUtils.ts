import { convertFloat32ToInt16 } from './audioConverter';

// ────────────────────────────
// Audio streaming helpers
// ────────────────────────────
// 单例化资源，保证仅一次 getUserMedia
let audioContext: AudioContext | null = null;
let micStream: MediaStream | null = null;
let micGain: GainNode;
let processor: ScriptProcessorNode;
let isStreaming = false; // true = gain=1 & context.running

/**
 * 一次性初始化麦克风流（含权限弹窗），初始静音并挂起
 */
export async function initPCMStream(ws: WebSocket) {
  if (micStream) return; // 已初始化无需重复

  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext();

  const source = audioContext.createMediaStreamSource(micStream);
  micGain = audioContext.createGain();
  processor = audioContext.createScriptProcessor(4096, 1, 1);

  // 链路: 麦克风 → 增益 → 处理器 → (可选监听) 输出
  source.connect(micGain).connect(processor);
  processor.connect(audioContext.destination);

  // 推流到服务器
  processor.onaudioprocess = (e) => {
    if (!isStreaming) return; // 静音时不推
    const input = e.inputBuffer.getChannelData(0);
    const pcm = convertFloat32ToInt16(input);
    ws.send(pcm);
  };

  // 初始静音 & 挂起，避免蓝牙耳机留在 HFP 模式
  micGain.gain.value = 0;
  await audioContext.suspend();
  isStreaming = false;
}

/**
 * 恢复麦克风推流 (gain=1 + resume Context)
 */
export async function startPCMStream() {
  if (!audioContext || !micGain) return;
  if (isStreaming) return; // 已在推流
  await audioContext.resume();
  micGain.gain.value = 1;
  isStreaming = true;
}

/**
 * 静音麦克风推流 (gain=0 + suspend Context)
 */
export async function stopPCMStream() {
  if (!audioContext || !micGain) return;
  if (!isStreaming) return; // 已静音
  micGain.gain.value = 0;
  await audioContext.suspend();
  isStreaming = false;
}
