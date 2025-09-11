import { createComponentLogger } from '@services/DebugLogger'
import { css, html, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { PixiApplicationLike } from './types'
import './live2d-canvas'
import './live2d-model'

const log = createComponentLogger('live2d-visual')

interface PixiReadyEvent extends CustomEvent {
  detail: {
    app: PixiApplicationLike
    width: number
    height: number
  }
}

@customElement('live2d-visual')
export class Live2DVisual extends LitElement {
  @property({ type: String }) motionName = ''
  @state() private _status: 'idle' | 'loading' | 'ready' | 'error' = 'idle'
  @state() private _error = ''
  @state() private _app?: PixiApplicationLike
  @state() private _containerWidth = 0
  @state() private _containerHeight = 0
  @property({ type: String }) modelUrl = ''
  @property({ attribute: false }) inputNode?: AudioNode
  @property({ attribute: false }) outputNode?: AudioNode
  @property({ type: String }) emotion = 'neutral'

  static styles = css`
    :host {
      position: absolute;
      inset: 0;
      display: block;
    }
    .status {
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.5);
      color: #fff;
      padding: 4px 8px;
      border-radius: 6px;
      font: 12px/1.2 system-ui;
      z-index: 10;
    }
  `

  private _onLoaded = () => {
    this._status = 'ready'
    this._error = ''
    // Auto-hide the status chip after 1s when ready
    setTimeout(() => {
      if (this._status === 'ready') this._status = 'idle'
    }, 1000)
  }
  private _onError = (e: CustomEvent<{ error: string }>) => {
    this._status = 'error'
    this._error = e.detail?.error || 'Load error'
  }
  private _onPixiReady = () => {
    log.debug('pixi-ready')
    if (this._status === 'idle') {
      this._status = 'loading'
    }
  }

  render() {
    return html`
      ${this._status !== 'idle'
        ? html`<div class="status">
            ${this._status}${this._error ? `: ${this._error}` : ''}
          </div>`
        : ''}
      ${this._status !== 'idle'
        ? log.debug('status', { status: this._status, error: this._error })
        : ''}
      <live2d-canvas
        @pixi-ready=${(e: PixiReadyEvent) => {
          log.debug('pixi-ready', e.detail)
          this._onPixiReady()
          this._app = e.detail.app
          this._containerWidth = e.detail.width
          this._containerHeight = e.detail.height
        }}
      >
        <live2d-model
          .url=${this.modelUrl}
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}
          .emotion=${this.emotion}
          .motionName=${this.motionName}
          .personaName=${this.getAttribute('persona-name') || ''}
          .app=${this._app}
          .containerWidth=${this._containerWidth}
          .containerHeight=${this._containerHeight}
          @live2d-loaded=${this._onLoaded}
          @live2d-error=${this._onError}
        ></live2d-model>
      </live2d-canvas>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'live2d-visual': Live2DVisual
  }
}
