import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createComponentLogger } from "../src/debug-logger";
import "./live2d-visual";

const log = createComponentLogger("live2d-gate");

/**
 * Wrapper that chooses Live2D (if available) and falls back to the sphere 3D visual.
 * It also ensures the fallback is fully detached when Live2D is loaded (for perf).
 */
@customElement("live2d-gate")
export class Live2DGate extends LitElement {
  @property({ type: String }) modelUrl: string = "";
  @property({ attribute: false }) inputNode?: AudioNode;
  @property({ attribute: false }) outputNode?: AudioNode;

  @state() private _live2dReady = false;
  @state() private _live2dError = "";
  @state() private _fallbackLoaded = false;

  static styles = css`
    :host { position: relative; width: 100%; height: 100%; display: block; }
    .layer { position: absolute; inset: 0; }
  `;

  private _onLoaded = () => {
    log.debug("live2d loaded event received");
    // Live2D reported loaded, hide/remove fallback
    this._live2dReady = true;
  };

  private _onError = (e: CustomEvent<{ error: string }>) => {
    log.warn("live2d error event received", e.detail);
    this._live2dError = e.detail?.error || "Live2D failed";
    this._live2dReady = false;
  };

  protected async updated(changed?: Map<string, unknown>) {
    if (changed?.has("modelUrl")) {
      log.debug("modelUrl changed", { url: this.modelUrl });
    }
    const showFallback = !this._live2dReady;
    if (showFallback && !this._fallbackLoaded) {
      await this._ensureFallbackLoaded();
    }
  }

  private async _ensureFallbackLoaded() {
    try {
      await import("../visual-3d");
    } catch (e) {
      log.warn("Failed to load fallback 3D visual module", { error: e });
    } finally {
      this._fallbackLoaded = true;
    }
  }

  render() {
    const showFallback = !this._live2dReady;
    return html`
      ${
        showFallback
          ? html`<gdm-live-audio-visuals-3d class="layer" .inputNode=${this.inputNode} .outputNode=${this.outputNode}></gdm-live-audio-visuals-3d>`
          : ""
      }

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
    "live2d-gate": Live2DGate;
  }
}
