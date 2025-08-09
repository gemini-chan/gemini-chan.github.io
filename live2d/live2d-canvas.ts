import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PixiApplicationLike } from './types';

@customElement('live2d-canvas')
export class Live2DCanvas extends LitElement {
  private _container?: HTMLDivElement;
  private _canvas?: HTMLCanvasElement;
  private _app?: PixiApplicationLike;

  @state() private _error: string = '';

  // Expose app via event for child components to hook into
  get app() { return this._app; }

  private _dispatchAppReady(app: PixiApplicationLike) {
    const rect = this._container?.getBoundingClientRect();
    this.dispatchEvent(new CustomEvent('pixi-ready', { detail: { app, width: rect?.width ?? 0, height: rect?.height ?? 0 }, bubbles: true, composed: true }));
  }

  static styles = css`
    :host { display: block; position: relative; width: 100%; height: 100%; }
    .root { position: absolute; inset: 0; }
    canvas { width: 100%; height: 100%; display: block; }
    .error { position: absolute; inset: 0; display: grid; place-items: center; color: #ff8a80; font: 14px/1.5 system-ui; }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    // kick off lazy init in updateComplete to ensure DOM exists
    queueMicrotask(() => this._ensurePixi());
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardown();
  }

  private async _ensurePixi() {
    if (this._app) return;
    try {
      // Dynamically import to avoid bundling if not used
      const [pixi, live2d] = await Promise.all([
        import('pixi.js') as any,
        import('pixi-live2d-display/cubism4') as any,
      ]);
      const { Application, Ticker } = pixi as any;
      const { Live2DModel } = live2d as any;
      // Expose PIXI globally and register ticker for Live2D
      (window as any).PIXI = pixi;
      Live2DModel?.registerTicker?.(Ticker);

      // create canvas and container
      this._container = this.shadowRoot!.querySelector('.root') as HTMLDivElement;
      if (!this._container) {
        await this.updateComplete;
        this._container = this.shadowRoot!.querySelector('.root') as HTMLDivElement;
      }

      // Create application (Pixi v6 requires manual view append)
      const app = new Application({
        antialias: true,
        backgroundAlpha: 0,
        // We'll manage resize manually via ResizeObserver
        width: Math.max(1, this._container?.clientWidth || 1),
        height: Math.max(1, this._container?.clientHeight || 1),
      }) as unknown as PixiApplicationLike;

      const view = (app as any).view as HTMLCanvasElement;
      if (this._container && view && !view.isConnected) {
        this._container.appendChild(view);
      }
      // Style canvas to fill container
      if (view) {
        view.style.width = '100%';
        view.style.height = '100%';
        view.style.display = 'block';
        (app as any).renderer?.resize?.(this._container.clientWidth, this._container.clientHeight);
      }

      this._canvas = view;
      this._app = app;
      this._dispatchAppReady(app);
    } catch (e: any) {
      console.error('Failed to init PIXI', e);
      this._error = 'Failed to initialize graphics';
    }
  }

  private _teardown() {
    try {
      const app = this._app as any;
      // stop ticker and destroy app if available
      app?.ticker?.stop?.();
      app?.destroy?.(true);
    } catch (e) {
      // ignore
    } finally {
      this._app = undefined;
      this._canvas = undefined;
    }
  }

  private _onResize = () => {
    const rect = this._container?.getBoundingClientRect();
    if (!rect || !this._app) return;
    this._app.renderer.resize(rect.width, rect.height);
  };

  firstUpdated(): void {
    // Attach observer for resize for better high-DPI handling
    const ro = new ResizeObserver(this._onResize);
    const el = this.shadowRoot!.querySelector('.root') as HTMLElement;
    if (el) ro.observe(el);
  }

  render() {
    return html`
      <div class="root">
        ${this._error ? html`<div class="error">${this._error}</div>` : ''}
        <!-- PIXI manages the canvas element internally -->
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'live2d-canvas': Live2DCanvas;
  }
}
