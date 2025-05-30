class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const samples = input[0];
      this.port.postMessage(samples);
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
