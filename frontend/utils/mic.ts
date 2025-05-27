// frontend/utils/mic.ts

export async function startMicStream(): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
      },
      video: false,
    });

    console.log('[🎙️] Microphone stream started');
    return stream;
  } catch (err) {
    console.error('❌ Failed to access microphone:', err);
    throw err;
  }
}
