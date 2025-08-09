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

  // Config
  private attack: number; // faster rise
  private release: number; // slower fall
  private threshold: number;
  private scale: number;

  constructor(opts: { inputNode?: AudioNode; outputNode?: AudioNode; attack?: number; release?: number; threshold?: number; scale?: number }) {
    if (opts.inputNode) this.inputAnalyser = new Analyser(opts.inputNode);
    if (opts.outputNode) this.outputAnalyser = new Analyser(opts.outputNode);
    this.attack = opts.attack ?? 0.5;
    this.release = opts.release ?? 0.1;
    this.threshold = opts.threshold ?? 0.05;
    this.scale = opts.scale ?? 1.0;
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

    // Map and clamp with threshold/scale
    const mapped = Math.max(0, Math.min(1, ((rms - this.threshold) / 0.5) * this.scale));
    return mapped;
  }

  // Mouth open is driven purely by output (TTS) so the avatar speaks when it talks
  get mouthOpen(): number {
    return this.outEnv;
  }
}
