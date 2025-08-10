import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("settings-menu")
export class SettingsMenu extends LitElement {
  @property({ type: String })
  apiKey = "";

  @state()
  private _error = "";

  @state()
  private _isSaving = false;

  @state()
  private _saved = false;

  static styles = css`
    :host {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    :host([active]) {
      opacity: 1;
    }
    .container {
      background: #222;
      color: #eee;
      padding: 2em;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 1em;
      width: 400px;
    }
    h2 {
      color: #fff;
      margin: 0 0 0.5em 0;
    }
    label {
      color: #ccc;
      font-size: 0.9em;
    }
    .input-group {
      position: relative;
      display: flex;
      align-items: center;
    }
    input::placeholder {
      color: #aaa;
    }
    input {
      background: #333;
      border: 1px solid #555;
      color: white;
      padding: 0.5em 2.5em 0.5em 0.5em;
      border-radius: 6px;
      flex: 1;
    }
    .paste-button {
      position: absolute;
      right: 0.5em;
      background: transparent;
      border: none;
      color: #ccc;
      cursor: pointer;
      padding: 0.25em;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s ease-in-out;
    }
    .paste-button:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
    }
    .paste-icon {
      width: 16px;
      height: 16px;
    }
    .buttons {
      display: flex;
      gap: 1em;
      justify-content: flex-end;
    }
    button {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        padding: 0.5em 1em;
        cursor: pointer;
        transition: background-color 0.2s ease-in-out;
    }
    button:hover {
        background: rgba(255, 255, 255, 0.2);
    }
    .error {
      color: #ff8a80;
      font-size: 0.9em;
    }
  `;

  render() {
    return html`
      <div class="container" @click=${this._stopPropagation}>
        <h2>Settings</h2>
        <label for="modelUrl">Live2D Model URL</label>
        <input
          id="modelUrl"
          type="text"
          .value=${localStorage.getItem("live2d-model-url") || "https://gateway.xn--vck1b.shop/models/hiyori_pro_en.zip"}
          placeholder="Enter model3.json or .zip URL" />

        <label for="apiKey">API Key</label>
        <div class="input-group">
          <input
            id="apiKey"
            type="password"
            .value=${this.apiKey}
            @input=${this._onApiKeyInput}
            placeholder="Enter your API Key" />
          <button class="paste-button" @click=${this._onPaste} title="Paste from clipboard">
            <svg class="paste-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3"/>
            </svg>
          </button>
        </div>
        ${this._error ? html`<div class="error">${this._error}</div>` : ""}

        <div class="buttons">
          <button @click=${this._getApiKeyUrl}>Get API Key</button>
          <button @click=${this._handleSave} ?disabled=${this._isSaving || this._saved}>
            ${this._isSaving ? "Saving..." : this._saved ? "Saved ✔" : "Save"}
          </button>
        </div>
      </div>
    `;
  }

  firstUpdated() {
    this.shadowRoot.host.setAttribute("active", "true");
    // Add click-outside functionality
    this.addEventListener("click", this._handleBackdropClick);
  }

  private _handleBackdropClick(e: Event) {
    // Close the modal when clicking on the backdrop
    this.dispatchEvent(new CustomEvent("close"));
  }

  private _stopPropagation(e: Event) {
    // Prevent clicks inside the container from closing the modal
    e.stopPropagation();
  }

  private _onApiKeyInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.apiKey = input.value;
    this._error = ""; // Clear error on input
  }

  private async _onPaste() {
    try {
      const text = await navigator.clipboard.readText();
      this.apiKey = text;
    } catch (err) {
      this._error = "Failed to paste from clipboard.";
      console.error("Failed to read clipboard contents: ", err);
    }
  }

  private _handleSave() {
    if (this._validateApiKey(this.apiKey)) {
      this._isSaving = true;
      localStorage.setItem("gemini-api-key", this.apiKey);
      // Save model URL if present
      const modelInput =
        this.shadowRoot!.querySelector<HTMLInputElement>("#modelUrl");
      if (modelInput && modelInput.value) {
        localStorage.setItem("live2d-model-url", modelInput.value);
      }
      this.dispatchEvent(new CustomEvent("api-key-saved"));

      setTimeout(() => {
        this._isSaving = false;
        this._saved = true;
        setTimeout(() => {
          this.dispatchEvent(new CustomEvent("close"));
          this._saved = false;
        }, 1000);
      }, 1000);
    }
  }

  private _validateApiKey(key: string): boolean {
    if (!key) {
      this._error = "API key cannot be empty.";
      return false;
    }
    // Basic format validation
    if (!key.startsWith("AIzaSy") || key.length !== 39) {
      this._error = "Invalid API key format.";
      return false;
    }
    return true;
  }

  private _getApiKeyUrl() {
    window.open("https://aistudio.google.com/apikey", "_blank");
  }
}
