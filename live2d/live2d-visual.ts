import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './live2d-canvas';
import './live2d-model';

@customElement('live2d-visual')
export class Live2DVisual extends LitElement {
  @property({ type: String }) modelUrl = '';
  @property({ attribute: false }) inputNode?: AudioNode;
  @property({ attribute: false }) outputNode?: AudioNode;

  static styles = css`
    :host { position: absolute; inset: 0; display: block; }
  `;

  render() {
    return html`
      <live2d-canvas @pixi-ready=${(e: CustomEvent) => console.log('[Live2D] PIXI ready', e.detail)}>
        <live2d-model
          .url=${this.modelUrl}
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}
          .app=${(e.currentTarget as any)?.app}
        ></live2d-model>
      </live2d-canvas>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'live2d-visual': Live2DVisual;
  }
}
