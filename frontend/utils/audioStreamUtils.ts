import { convertFloat32ToInt16 } from './audioConverter';

let audioContext: AudioContext | null = null;
let micStream: MediaStream | null = null;
let micGain: GainNode;
let processor: ScriptProcessorNode;

/**
 * 一次性初始化麦克风流，并静音
 */
export async function initPCMStream(ws: WebSocket) {
  if (micStream) return;

  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext();

  const source = audioContext.createMediaStreamSource(micStream);
  micGain = audioContext.createGain();
  processor = audioContext.createScriptProcessor(4096, 1, 1);

  // 链路：麦克风 -> 增益 -> 处理器 -> 输出
  source.connect(micGain).connect(processor).connect(audioContext.destination);

  // PCM 处理
  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    const pcm = convertFloat32ToInt16(input);
    ws.send(pcm);
  };

  // 初始化时静音
  micGain.gain.value = 0;
}

/**
 * 恢复麦克风流推送
 */
export function startPCMStream() {
  if (!micGain) return;
  micGain.gain.value = 1;
}

/**
 * 静音麦克风流
 */
export function stopPCMStream() {
  if (!micGain) return;
  micGain.gain.value = 0;
}
