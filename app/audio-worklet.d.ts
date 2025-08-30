// Ambient declarations for the AudioWorklet global scope
// Reference: https://webaudio.github.io/web-audio-api/

declare const currentTime: number;
declare const currentFrame: number;
declare const sampleRate: number;

// Minimal shape of the processor base class present in the worklet global scope
declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: { processorOptions?: unknown });
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

// API to register a processor class under a given name
declare function registerProcessor(
  name: string,
  processorCtor: new (options?: { processorOptions?: unknown }) => AudioWorkletProcessor
): void;
