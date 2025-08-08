import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PixiApplicationLike, Live2DModelLike, Live2DModelConfig } from './types';

@customElement('live2d-model')
export class Live2DModelComponent extends LitElement {
  private _app?: PixiApplicationLike;
  private _model?: Live2DModelLike & { internalModel?: any } | undefined;

  @property({ type: String }) url: string = '';
  @property({ type: Number }) scale = 1.0;
  @property({ type: Array }) anchor: [number, number] = [0.5, 0.5];
  @property({ type: Boolean }) fitToCanvas: boolean = true;

  // Audio nodes for future integration
  @property({ attribute: false }) inputNode?: AudioNode;
  @property({ attribute: false }) outputNode?: AudioNode;

  private _mapper?: (typeof import('./audio-mapper'))['AudioToAnimationMapper'];

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
    ev.stopPropagation();
    this._app = ev.detail.app;
    this._maybeLoad();
  };

  private async _maybeLoad() {
    if (!this._app) return;
    if (!this.url) { this._error = 'No Live2D model configured.'; return; }
    await this._loadModel(this.url);
    this._startLoop();
  }

  private async _loadModel(url: string) {
    if (!this._app) return;

    this._loading = true;
    this._error = '';

    try {
      // Dynamically import Live2D to avoid bundling if unused
      const mod: any = await import('pixi-live2d-display/cubism4');
      const Live2DModel = mod.Live2DModel ?? mod.default ?? mod;

      // Retry mechanism with exponential backoff
      const attemptLoad = async (attempt: number): Promise<Live2DModelLike> => {
        try {
          return (await Live2DModel.from(url)) as any;
        } catch (err) {
          if (attempt >= 3) throw err;
          const delay = 300 * Math.pow(2, attempt); // 300ms, 600ms, 1200ms
          await new Promise((res) => setTimeout(res, delay));
          return attemptLoad(attempt + 1);
        }
      };

      const model: Live2DModelLike = await attemptLoad(0);

      // basic transform
      try { model.anchor?.set?.(this.anchor[0], this.anchor[1]); } catch {}
      try { model.scale?.set?.(this.scale, this.scale); } catch {}

      // fit to renderer size
      if (this.fitToCanvas && this._app?.renderer && (model as any).width && (model as any).height) {
        const rw = (this._app as any).renderer.width;
        const rh = (this._app as any).renderer.height;
        const mw = (model as any).width;
        const mh = (model as any).height;
        if (mw && mh && rw && rh) {
          const s = Math.min(rw / mw, rh / mh) * this.scale;
          try { model.scale?.set?.(s, s); } catch {}
          try { model.position?.set?.(rw * this.anchor[0], rh * this.anchor[1]); } catch {}
        }
      }

      // add to stage
      this._app.stage.addChild(model as any);
      this._model = model;
      this.dispatchEvent(new CustomEvent('live2d-loaded', { bubbles: true, composed: true }));
    } catch (e: any) {
      console.error('Failed to load Live2D model', e);
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

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('url')) {
      // reload on url change
      this._destroyModel();
      this._maybeLoad();
    }
    if (changed.has('inputNode') || changed.has('outputNode')) {
      // re-init mapper
      this._initMapper();
    }
  }

  render() {
    if (this._error) return html`<div class="overlay">${this._error}</div>`;
    if (this._loading) return html`<div class="overlay">Loading Live2D...</div>`;
    return html``;
  }

  private async _initMapper() {
    const { AudioToAnimationMapper } = await import('./audio-mapper');
    this._mapper = new AudioToAnimationMapper({ inputNode: this.inputNode, outputNode: this.outputNode, attack: 0.5, release: 0.15, threshold: 0.04, scale: 1.0 });
  }

  private _startLoop() {
    this._stopLoop();
    if (!this._app) return;
    // Ensure mapper exists
    if (!this._mapper) this._initMapper();

    const appAny: any = this._app;
    const ticker = appAny.ticker;
    if (!ticker) return; // shouldn't happen with PIXI

    const cb = () => {
      this._mapper?.update();
      const m = this._model as any;
      const internal = m?.internalModel;
      const mouth = this._mapper?.mouthOpen ?? 0;
      // Set mouth parameter if available (Cubism standard parameter)
      try {
        internal?.coreModel?.setParameterValueById?.('ParamMouthOpenY', mouth);
        internal?.coreModel?.setParameterValueById?.('ParamMouthForm', Math.min(1, mouth * 1.2));
        // Apply some subtle idle motion to keep model alive when no audio
        if (mouth < 0.01) {
          const t = performance.now() / 1000;
          const breathe = (Math.sin(t * 1.2) + 1) * 0.03; // 0..0.06
          internal?.coreModel?.setParameterValueById?.('ParamAngleX', breathe);
          internal?.coreModel?.setParameterValueById?.('ParamBodyAngleX', breathe * 0.5);
          internal?.coreModel?.setParameterValueById?.('ParamAngleY', Math.sin(t * 0.6) * 0.02);
          internal?.coreModel?.setParameterValueById?.('ParamAngleZ', Math.sin(t * 0.4) * 0.02);
        }
      } catch {}
    };

    ticker.add(cb);
    (this as any)._loopCb = cb;
  }

  private _stopLoop() {
    const appAny: any = this._app;
    const ticker = appAny?.ticker;
    const cb = (this as any)._loopCb;
    if (ticker && cb) ticker.remove(cb);
    (this as any)._loopCb = undefined;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'live2d-model': Live2DModelComponent;
  }
}
