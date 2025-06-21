// src/utils/audioConverter.ts
/**
 * 把 Web Audio 的 Float32Array 转成 16-bit PCM (Int16Array)。
 * 服务器大多只接受 16bit PCM，所以要做这个转换。
 */
export function convertFloat32ToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    // 先把数值夹在 [-1, 1]，再映射到 Int16
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}
