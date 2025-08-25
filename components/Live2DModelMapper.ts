import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createComponentLogger } from "@services/DebugLogger";
import { EmotionKey, EmotionMapping, Live2DMappingService } from "@services/Live2DMappingService";

const log = createComponentLogger("live2d-model-mapper");

@customElement("live2d-model-mapper")
export class Live2DModelMapper extends LitElement {
  static styles = css`
    :host { display: block; }
    .row { display: grid; grid-template-columns: 160px 1fr; gap: 8px; align-items: center; margin: 8px 0; }
    .kv { display: flex; gap: 8px; }
    input[type="text"] { width: 100%; }
    textarea { width: 100%; min-height: 60px; font-family: monospace; }
    .help { color: #888; font-size: 12px; }
    button { padding: 6px 10px; }
  `;

  @property({ type: String }) modelUrl = "";
  @state() private _mappings: Record<EmotionKey, EmotionMapping> = {};
  @state() private _paramsError: string = "";
  @state() private _motionError: string = "";

  connectedCallback(): void {
    super.connectedCallback();
    this._load();
  }

  private _load() {
    const existing = Live2DMappingService.get(this.modelUrl)?.emotions;
    this._mappings = existing ? { ...existing } : {};
  }

  private _save() {
    try {
      Live2DMappingService.set(this.modelUrl, this._mappings);
      log.info("saved mappings", { modelUrl: this.modelUrl });
    } catch (e) {
      log.error("save failed", e);
    }
  }

  private _updateEmotion(key: EmotionKey, field: keyof EmotionMapping, value: unknown) {
    const entry = this._mappings[key] || {};
    const next = { ...entry, [field]: value } as EmotionMapping;
    this._mappings = { ...this._mappings, [key]: next };
    this.requestUpdate();
  }

  private _removeEmotion(key: EmotionKey) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: _removed, ...rest } = this._mappings;
    this._mappings = rest as Record<EmotionKey, EmotionMapping>;
    this.requestUpdate();
  }

  private _addEmotion() {
    const el = this.shadowRoot?.querySelector<HTMLInputElement>("#new-emotion");
    const key = el?.value?.trim();
    if (!key) return;
    if (!this._mappings[key as EmotionKey]) {
      this._mappings = { ...this._mappings, [key as EmotionKey]: {} };
      this.requestUpdate();
    }
  }

  private _applyTest(key: EmotionKey) {
    const map = this._mappings[key];
    if (!map) return;
    // Dispatch an event so app/main.tsx can set emotion/motion quickly for preview
    this.dispatchEvent(new CustomEvent('live2d-test-emotion', {
      detail: { emotion: key, mapping: map },
      bubbles: true, composed: true
    }));
  }

  private _renderEmotion(key: EmotionKey, mapping: EmotionMapping) {
    const paramsJson = JSON.stringify(mapping.params ?? [], null, 2);
    const motionJson = JSON.stringify(mapping.motion ?? { group: "Idle", index: 0 }, null, 2);
    return html`
      <div class="row">
        <div><strong>${key}</strong></div>
        <div class="kv">
          <label>Params (JSON)</label>
          <textarea @input=${(e: InputEvent) => {
            const target = e.target as HTMLTextAreaElement;
            try { this._updateEmotion(key, "params", JSON.parse(target.value)); this._paramsError = ""; }
            catch { this._paramsError = `Invalid params JSON for ${key}`; }
          }} @blur=${() => this._save()}>${paramsJson}</textarea>
          ${this._paramsError ? html`<div class="help" style="color:#d33;">${this._paramsError}</div>` : ""}
        </div>
      </div>
      <div class="row">
        <div></div>
        <div class="kv">
          <label>Motion (JSON)</label>
          <textarea @input=${(e: InputEvent) => {
            const target = e.target as HTMLTextAreaElement;
            try { this._updateEmotion(key, "motion", JSON.parse(target.value)); this._motionError = ""; }
            catch { this._motionError = `Invalid motion JSON for ${key}`; }
          }} @blur=${() => this._save()}>${motionJson}</textarea>
          ${this._motionError ? html`<div class="help" style="color:#d33;">${this._motionError}</div>` : ""}
        </div>
      </div>
      <div class="row">
        <div></div>
        <div>
          <button @click=${() => this._applyTest(key)}>Test</button>
          <button @click=${() => this._removeEmotion(key)}>Remove</button>
        </div>
      </div>
      <hr />
    `;
  }

  render() {
    return html`
      <div class="help">
        Params JSON: array of { id: string, value: number }, applied each frame when this emotion is active.<br/>
        Motion JSON: { group: string, index: number }. You can also trigger a motion manually using group:index via the Test button.
      </div>

      ${Object.entries(this._mappings).map(([k, v]) => this._renderEmotion(k as EmotionKey, v))}

      <div class="row">
        <div>Add Emotion Key</div>
        <div class="kv">
          <input id="new-emotion" placeholder="e.g. joy, sadness, custom-key" />
          <button @click=${this._addEmotion}>Add</button>
        </div>
      </div>

    `;
  }
}

declare global { interface HTMLElementTagNameMap { "live2d-model-mapper": Live2DModelMapper; } }
