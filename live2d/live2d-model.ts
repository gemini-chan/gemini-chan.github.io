import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PixiApplicationLike, Live2DModelLike, Live2DModelConfig } from './types';

@customElement('live2d-model')
export class Live2DModelComponent extends LitElement {
  private _app?: PixiApplicationLike;
  @property({ attribute: false }) app?: PixiApplicationLike;
  private _model?: Live2DModelLike & { internalModel?: any } | undefined;

  @property({ type: String }) url: string = '';
  @property({ type: Number }) scale = 1.0;
  @property({ type: Array }) anchor: [number, number] = [0.5, 0.5];
  @property({ type: Boolean }) fitToCanvas: boolean = true;
  @property({ type: Number }) containerWidth: number = 0;
  @property({ type: Number }) containerHeight: number = 0;
  @property({ type: Number }) xOffset: number = 0;
  @property({ type: Number }) yOffset: number = -80;

  // Guarded restart for animation loop after errors
  private _loopRestartDelay = 1000; // ms
  private _loopRestartTimer: any = undefined;

  // Audio nodes for future integration
  @property({ attribute: false }) inputNode?: AudioNode;
  @property({ attribute: false }) outputNode?: AudioNode;

  private _mapper?: any;
  private _idle?: any;

  @state() private _error: string = '';
  @state() private _loading: boolean = false;

  static styles = css`
    :host { display: contents; }
    .overlay { position: absolute; inset: 0; display: grid; place-items: center; color: white; pointer-events: none; font: 14px/1.5 system-ui; }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('pixi-ready', this._onPixiReady as EventListener);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('pixi-ready', this._onPixiReady as EventListener);
    this._destroyModel();
  }

  private _onPixiReady = (ev: CustomEvent<{ app: PixiApplicationLike }>) => {
    console.log('[Live2D] on pixi-ready');
    ev.stopPropagation();
    this._app = ev.detail.app;
    this._maybeLoad();
  };

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('app') && this.app && !this._app) {
      console.log('[Live2D] app provided via prop');
      this._app = this.app;
      this._maybeLoad();
    }
    if (changed.has('url')) {
      // reload on url change
      this._destroyModel();
      this._maybeLoad();
    }
    if (changed.has('inputNode') || changed.has('outputNode')) {
      // re-init mapper
      this._initMapper();
    }
    if (changed.has('containerWidth') || changed.has('containerHeight')) {
      this._applyPlacement();
    }
  }

  protected firstUpdated() {
    if (!this._app) {
      const parentAny = (this.parentElement as any) ?? (this.getRootNode() as any)?.host;
      const app = parentAny?.app;
      if (app) {
        console.log('[Live2D] got app from parent');
        this._app = app;
        this._maybeLoad();
      } else {
        console.warn('[Live2D] parent app not found at firstUpdated');
      }
    }
  }

  private async _maybeLoad() {
    if (!this._app) return;
    if (!this.url) { this._error = 'No Live2D model configured.'; return; }
    await this._loadModel(this.url);
    this._startLoop();
  }

  private async _loadModel(url: string) {
    console.log('[Live2D] loadModel start', url);
    if (!this._app) return;

    this._loading = true;
    this._error = '';

    try {
      // Ensure Cubism Core is present before importing cubism4
      if (!(window as any).Live2DCubismCore) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = '/assets/js/CubismSdkForWeb-5-r.3/Core/live2dcubismcore.min.js';
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Cubism Core missing'));
          document.head.appendChild(s);
        });
      }

      // Dynamically import Live2D to avoid bundling if unused
      // Configure ZipLoader if available so .zip URLs work
      await import('./zip-loader');
      const mod: any = await import('pixi-live2d-display/cubism4');
      const Live2DModel = mod.Live2DModel ?? mod.default ?? mod;

      // Retry mechanism with exponential backoff
      const attemptLoad = async (attempt: number): Promise<Live2DModelLike> => {
        try {
          // If URL is a Blob URL or remote .zip, Live2DModel.from should pick up our ZipLoader
          return (await Live2DModel.from(url)) as any;
        } catch (err) {
          if (attempt >= 3) throw err;
          const delay = 300 * Math.pow(2, attempt); // 300ms, 600ms, 1200ms
          await new Promise((res) => setTimeout(res, delay));
          return attemptLoad(attempt + 1);
        }
      };

      const model: Live2DModelLike = await attemptLoad(0);
      console.log('[Live2D] model loaded', model);

      // basic transform
      try { model.anchor?.set?.(this.anchor[0], this.anchor[1]); } catch {}
      try { model.scale?.set?.(this.scale, this.scale); } catch {}

      // Placement & scaling (Airi-aligned): bottom-center with fit-to-canvas using container size
      this._applyPlacement(model);

      // add to stage
      this._app.stage.addChild(model as any);
      this._model = model;
      console.log('[Live2D] added to stage');
      this.dispatchEvent(new CustomEvent('live2d-loaded', { bubbles: true, composed: true }));
    } catch (e: any) {
      console.error('[Live2D] Failed to load Live2D model', e);
      this._error = 'Failed to load Live2D model';
      this.dispatchEvent(new CustomEvent('live2d-error', { detail: { error: String(e?.message || e) }, bubbles: true, composed: true }));
    } finally {
      this._loading = false;
    }
  }

  private _destroyModel() {
    this._stopLoop();
    if (!this._model || !this._app) return;
    try { this._app.stage.removeChild(this._model as any); } catch {}
    try { this._model.destroy?.(); } catch {}
    this._model = undefined;
  }

  render() {
    if (this._error) return html`<div class="overlay">${this._error} <button style="pointer-events: auto" @click=${() => this._maybeLoad()}>Retry</button></div>`;
    if (this._loading) return html`<div class="overlay">Loading Live2D...</div>`;
    return html``;
  }

  private async _initMapper() {
    const { IdleEyeFocus } = await import('./idle-eye-focus');
    this._idle = new (IdleEyeFocus as any)({
      blinkMin: 2.8,
      blinkMax: 5.8,
      blinkDuration: 0.12,
      saccadeMin: 1.0,
      saccadeMax: 2.4,
      saccadeSpeed: 2.8,
      eyeRange: 0.12,
    });
    const { AudioToAnimationMapper } = await import('./audio-mapper');
    this._mapper = new (AudioToAnimationMapper as any)({ inputNode: this.inputNode, outputNode: this.outputNode, attack: 0.5, release: 0.15, threshold: 0.04, scale: 1.0 });
  }

  private _startLoop() {
    let last = performance.now();
    this._stopLoop();
    if (!this._app) return;
    // Ensure mapper exists
    if (!this._mapper) this._initMapper();
    // Ensure idle system exists
    if (!this._idle) {/* no-op, created in _initMapper */}

    const appAny: any = this._app;
    const ticker = appAny.ticker;
    if (!ticker) return; // shouldn't happen with PIXI

    const cb = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      this._mapper?.update();
      this._idle?.update(dt);
      const m = this._model as any;
      const internal = m?.internalModel;
      const mouth = this._mapper?.mouthOpen ?? 0;
      // Set mouth parameter if available (Cubism standard parameter)
      try {
        internal?.coreModel?.setParameterValueById?.('ParamMouthOpenY', mouth);
        internal?.coreModel?.setParameterValueById?.('ParamMouthForm', Math.min(1, mouth * 1.2));
        // Apply some subtle idle motion to keep model alive when no audio
        if (mouth < 0.02 && this._idle) {
          // Breathing micro-motion
          const t = performance.now() / 1000;
          const breathe = (Math.sin(t * 1.1) + 1) * 0.025; // 0..0.05
          internal?.coreModel?.setParameterValueById?.('ParamBodyAngleX', breathe * 0.6);
          // Eye movement and blink
          internal?.coreModel?.setParameterValueById?.('ParamEyeBallX', this._idle.eyeX);
          internal?.coreModel?.setParameterValueById?.('ParamEyeBallY', this._idle.eyeY);
          internal?.coreModel?.setParameterValueById?.('ParamEyeLOpen', this._idle.eyeOpen);
          internal?.coreModel?.setParameterValueById?.('ParamEyeROpen', this._idle.eyeOpen);
        }
      } catch (err) {
        // Log and halt the animation loop to avoid spamming if model internals error
        console.error('[Live2D] animation update error', err);
        this._stopLoop();
        // Schedule a guarded restart to recover from transient errors
        if (!this._loopRestartTimer) {
          this._loopRestartTimer = setTimeout(() => {
            this._loopRestartTimer = undefined;
            if (this._app && this._model) {
              try { this._startLoop(); } catch (e) { console.warn('[Live2D] loop restart failed', e); }
            }
          }, this._loopRestartDelay);
        }
      }
    };

    ticker.add(cb);
    this._loopCb = cb;
  }

  private _stopLoop() {
    const appAny: any = this._app;
    const ticker = appAny?.ticker;
    const cb = (this as any)._loopCb;
    if (ticker && cb) ticker.remove(cb);
    (this as any)._loopCb = undefined;
  }

  private _applyPlacement(modelArg?: any) {
    if (!this.fitToCanvas) return;
    const m: any = modelArg ?? this._model;
    if (!m) return;
    const initialW = m.width || 1;
    const initialH = m.height || 1;
    const cw = this.containerWidth || (this._app as any)?.screen?.width || 0;
    const ch = this.containerHeight || (this._app as any)?.screen?.height || 0;
    if (!cw || !ch) return;
    try { m.anchor?.set?.(0.5, 0.5); } catch {}
    const fit = 0.95;
    const offsetFactor = 2.2;
    const heightScale = (ch * fit / initialH) * offsetFactor;
    const widthScale = (cw * fit / initialW) * offsetFactor;
    const s = Math.min(heightScale, widthScale) * (this.scale || 1.0);
    try { m.scale?.set?.(s, s); } catch {}
    try { m.position?.set?.(cw / 2 + (this.xOffset || 0), ch + (this.yOffset || 0)); } catch {}
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'live2d-model': Live2DModelComponent;
  }
}
