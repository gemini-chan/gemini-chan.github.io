import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../visual-3d';
import './live2d-visual';

/**
 * Wrapper that chooses Live2D (if available) and falls back to the sphere 3D visual.
 * It also ensures the fallback is fully detached when Live2D is loaded (for perf).
 */
@customElement('live2d-gate')
export class Live2DGate extends LitElement {
  @property({ type: String }) modelUrl: string = '';
  @property({ attribute: false }) inputNode?: AudioNode;
  @property({ attribute: false }) outputNode?: AudioNode;

  @state() private _live2dReady = false;
  @state() private _live2dError = '';

  static styles = css`
    :host { position: absolute; inset: 0; display: block; }
    .layer { position: absolute; inset: 0; }
  `;

  private _onLoaded = () => {
    // Live2D reported loaded, hide/remove fallback
    this._live2dReady = true;
  };

  private _onError = (e: CustomEvent<{ error: string }>) => {
    this._live2dError = e.detail?.error || 'Live2D failed';
    this._live2dReady = false;
  };

  render() {
    const showFallback = !this._live2dReady;
    return html`
      ${showFallback
        ? html`<gdm-live-audio-visuals-3d class="layer" .inputNode=${this.inputNode} .outputNode=${this.outputNode}></gdm-live-audio-visuals-3d>`
        : ''}

      <live2d-visual
        class="layer"
        .modelUrl=${this.modelUrl}
        .inputNode=${this.inputNode}
        .outputNode=${this.outputNode}
        @live2d-loaded=${this._onLoaded}
        @live2d-error=${this._onError}
      ></live2d-visual>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'live2d-gate': Live2DGate;
  }
}
