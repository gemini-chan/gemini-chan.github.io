/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Analyser class for live audio visualisation.
 */
export class Analyser {
  private analyser: AnalyserNode;
  private bufferLength = 0;
  private dataArray: Uint8Array;

  constructor(node: AudioNode) {
    this.analyser = node.context.createAnalyser();
    this.analyser.fftSize = 32;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    node.connect(this.analyser);
  }

  update() {
    // TS 6 uses a stricter generic for TypedArrays; cast to expected signature
    this.analyser.getByteFrequencyData(
      this.dataArray as unknown as Uint8Array<ArrayBuffer>,
    );
  }

  get data() {
    return this.dataArray;
  }
}
