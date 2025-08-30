class AudioProcessor extends AudioWorkletProcessor {
  private frameCounter = 0;

  constructor() {
    super();
  }

  process(
    inputs: Float32Array[][],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _outputs: Float32Array[][],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _parameters: Record<string, Float32Array>
  ): boolean {
    const input = inputs[0];
    if (input && input.length > 0) {
      const pcmData = input[0];
      if (pcmData) {
        this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
        this.frameCounter++;
      }
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
