/**
 * Converts audio analyser data into smooth animation parameters.
 */
import { Analyser } from '../analyser';

export class AudioToAnimationMapper {
  private inputAnalyser?: Analyser;
  private outputAnalyser?: Analyser;

  // Simple envelope followers for input/output
  private inEnv = 0;
  private outEnv = 0;

  // Smoothing factors
  private attack = 0.5; // faster rise
  private release = 0.1; // slower fall

  constructor(opts: { inputNode?: AudioNode; outputNode?: AudioNode }) {
    if (opts.inputNode) this.inputAnalyser = new Analyser(opts.inputNode);
    if (opts.outputNode) this.outputAnalyser = new Analyser(opts.outputNode);
  }

  update() {
    const inLevel = this.measure(this.inputAnalyser);
    const outLevel = this.measure(this.outputAnalyser);

    // envelope follow
    this.inEnv = this.follow(this.inEnv, inLevel);
    this.outEnv = this.follow(this.outEnv, outLevel);
  }

  private follow(env: number, target: number) {
    const coeff = target > env ? this.attack : this.release;
    return env + coeff * (target - env);
  }

  private measure(analyser?: Analyser): number {
    if (!analyser) return 0;
    analyser.update();
    const data = analyser.data;
    if (!data || data.length === 0) return 0;

    // Compute RMS-like level from frequency bins
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 255; // 0..1
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);

    // Map and clamp
    const mapped = Math.max(0, Math.min(1, (rms - 0.05) / 0.5));
    return mapped;
  }

  // Mouth open value driven more by output (TTS) but reacts to input as well
  get mouthOpen(): number {
    return Math.max(this.outEnv * 1.0, this.inEnv * 0.7);
  }
}
