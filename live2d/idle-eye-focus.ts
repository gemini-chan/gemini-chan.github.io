/**
 * Idle eye focus & blink controller inspired by typical Live2D behaviors.
 * - Random blinks within a range
 * - Random saccade eye movements with smooth interpolation
 */
export class IdleEyeFocus {
  // Eye openness 0..1 (blink)
  eyeOpen = 1;
  // Eye ball direction -1..1 (typical Live2D range, keep small for idles)
  eyeX = 0;
  eyeY = 0;

  private blinkTimer = 0;
  private nextBlink = 1.5;
  private blinking = false;
  private blinkProgress = 0; // 0..1 over blinkDuration

  private saccadeTimer = 0;
  private nextSaccade = 1.0;
  private targetX = 0;
  private targetY = 0;

  // Config
  constructor(
    private cfg: {
      blinkMin?: number; // seconds
      blinkMax?: number; // seconds
      blinkDuration?: number; // seconds for full close/open cycle
      saccadeMin?: number; // seconds
      saccadeMax?: number; // seconds
      saccadeSpeed?: number; // units/sec to move towards target
      eyeRange?: number; // max |x| and |y|
    } = {},
  ) {
    this.cfg.blinkMin ??= 3.0;
    this.cfg.blinkMax ??= 6.0;
    this.cfg.blinkDuration ??= 0.12; // brisk blink
    this.cfg.saccadeMin ??= 1.2;
    this.cfg.saccadeMax ??= 2.8;
    this.cfg.saccadeSpeed ??= 2.5; // units/sec
    this.cfg.eyeRange ??= 0.15;

    this.nextBlink = this.rand(this.cfg.blinkMin!, this.cfg.blinkMax!);
    this.nextSaccade = this.rand(this.cfg.saccadeMin!, this.cfg.saccadeMax!);
  }

  private rand(a: number, b: number) {
    return a + Math.random() * (b - a);
  }

  update(dt: number) {
    // Blink timing and shape (triangular close/open)
    this.blinkTimer += dt;
    if (!this.blinking && this.blinkTimer >= this.nextBlink) {
      this.blinking = true;
      this.blinkProgress = 0;
      this.blinkTimer = 0;
      this.nextBlink = this.rand(this.cfg.blinkMin!, this.cfg.blinkMax!);
    }

    if (this.blinking) {
      this.blinkProgress += dt / this.cfg.blinkDuration!;
      const p = Math.min(1, this.blinkProgress);
      // Triangle: down then up
      const tri = p < 0.5 ? p * 2 : (1 - p) * 2;
      this.eyeOpen = 0.2 + 0.8 * tri; // never fully shut; keep slight open
      if (p >= 1) this.blinking = false;
    } else {
      // Slowly ease to fully open when not blinking
      this.eyeOpen += (1 - this.eyeOpen) * Math.min(1, dt * 12);
    }

    // Saccade: randomly choose new target and move towards it
    this.saccadeTimer += dt;
    if (this.saccadeTimer >= this.nextSaccade) {
      this.saccadeTimer = 0;
      this.nextSaccade = this.rand(this.cfg.saccadeMin!, this.cfg.saccadeMax!);
      this.targetX = (Math.random() * 2 - 1) * this.cfg.eyeRange!;
      this.targetY = (Math.random() * 2 - 1) * this.cfg.eyeRange!;
    }

    const speed = this.cfg.saccadeSpeed!;
    const dx = this.targetX - this.eyeX;
    const dy = this.targetY - this.eyeY;
    const dist = Math.hypot(dx, dy);
    if (dist > 1e-4) {
      const step = Math.min(dist, speed * dt);
      const nx = dx / dist;
      const ny = dy / dist;
      this.eyeX += nx * step;
      this.eyeY += ny * step;
    }
  }
}
