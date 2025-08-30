class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      // Get the PCM data from the first channel
      const pcmData = input[0];
      
      // Send the PCM data to the main thread
      this.port.postMessage(pcmData);
    }
    
    // Keep the processor alive
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
