import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

interface FieldConfig {
  storageKey: string;
  validator?: (value: string) => boolean;
  eventName?: string;
  required?: boolean;
  preserveOnEmpty?: boolean;
}

@customElement("settings-menu")
export class SettingsMenu extends LitElement {
  @property({ type: String })
  apiKey = "";

  @state()
  private _error = "";

  @state()
  private _apiKeyValid = false;

  @state()
  private _apiKeyInvalid = false;

  @state()
  private _modelUrlValid = false;

  @state()
  private _modelUrlInvalid = false;

  static styles = css`
    :host {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 20;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }
    :host([active]) {
      opacity: 1;
    }
    .backdrop {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
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
      padding: 0.5em 5.5em 0.5em 0.5em;
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
    .validation-icon {
      position: absolute;
      right: 3em;
      background: transparent;
      border: none;
      padding: 0.25em;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform: scale(0.8);
      transition: all 0.2s ease-in-out;
      pointer-events: none;
    }
    .validation-icon.show {
      opacity: 1;
      transform: scale(1);
    }
    .tick-icon,
    .cross-icon {
      width: 16px;
      height: 16px;
    }
    .tick-icon {
      color: #4caf50;
    }
    .cross-icon {
      color: #ff8a80;
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
      <div class="backdrop" @click=${this._handleBackdropClick}>
        <div class="container" @click=${this._stopPropagation}>
          <h2>Settings</h2>
          <label for="modelUrl">Live2D Model URL</label>
          <div class="input-group">
            <input
              id="modelUrl"
              type="text"
              .value=${localStorage.getItem("live2d-model-url") || "https://gateway.xn--vck1b.shop/models/hiyori_pro_en.zip"}
              @input=${this._onModelUrlInput}
              @blur=${this._onModelUrlBlur}
              placeholder="Enter model3.json or .zip URL" />
            <div class="validation-icon ${this._modelUrlValid || this._modelUrlInvalid ? "show" : ""}" title="${this._modelUrlValid ? "Valid URL" : "Invalid URL"}">
              ${this._modelUrlValid
                ? html`<svg class="tick-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/></svg>`
                : this._modelUrlInvalid
                  ? html`<svg class="cross-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>`
                  : ""}
            </div>
            <button class="paste-button" @click=${this._onPasteModelUrl} title="Paste from clipboard">
              <svg class="paste-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3"/>
              </svg>
            </button>
          </div>

          <label for="apiKey">API Key</label>
          <div class="input-group">
            <input
              id="apiKey"
              type="password"
              .value=${this.apiKey}
              @input=${this._onApiKeyInput}
              @blur=${this._onApiKeyBlur}
              placeholder="Enter your API Key" />
            <div class="validation-icon ${this._apiKeyValid || this._apiKeyInvalid ? "show" : ""}" title="${this._apiKeyValid ? "Valid API Key" : "Invalid API Key"}">
              ${this._apiKeyValid
                ? html`<svg class="tick-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/></svg>`
                : this._apiKeyInvalid
                  ? html`<svg class="cross-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>`
                  : ""}
            </div>
            <button class="paste-button" @click=${this._onPaste} title="Paste from clipboard">
              <svg class="paste-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3"/>
              </svg>
            </button>
          </div>
  

          <div class="buttons">
            <button @click=${this._getApiKeyUrl}>Get API Key</button>
          </div>
        </div>
      </div>
    `;
  }

  firstUpdated() {
    this.shadowRoot!.host.setAttribute("active", "true");

    // Validate API Key, but only if it has a value
    if (this.apiKey) {
      const isApiKeyValid = this._validateApiKey(this.apiKey);
      this._setValidationState("apiKey", isApiKeyValid);
    }

    // Validate Model URL
    const modelUrlInput = this.shadowRoot!.querySelector<HTMLInputElement>('#modelUrl');
    if (modelUrlInput) {
      const isModelUrlValid = this._validateLive2dUrl(modelUrlInput.value);
      this._setValidationState("modelUrl", isModelUrlValid);
    }
  }

  private _handleBackdropClick(e: Event) {
    // Only close if clicking directly on the backdrop element
    if (e.target === e.currentTarget) {
      this.dispatchEvent(new CustomEvent("close"));
    }
  }

  private _stopPropagation(e: Event) {
    // Prevent clicks inside the container from closing the modal
    e.stopPropagation();
  }

  private _apiKeyInputDebounceTimer: number | undefined;

  private _onApiKeyInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this.apiKey = input.value;
    this._error = ""; // Clear error on input
    this._apiKeyValid = false;
    this._apiKeyInvalid = false;

    clearTimeout(this._apiKeyInputDebounceTimer);
    this._apiKeyInputDebounceTimer = window.setTimeout(() => {
      this._autoSave(
        input.value,
        {
          storageKey: "gemini-api-key",
          validator: this._validateApiKey.bind(this),
          eventName: undefined,
          required: true,
          preserveOnEmpty: true,
        },
        "apiKey",
      );
    }, 500); // 500ms debounce
  }

  private _modelUrlInputDebounceTimer: number | undefined;

  private _onModelUrlInput(e: Event) {
    const input = e.target as HTMLInputElement;
    this._error = ""; // Clear error on input
    this._modelUrlValid = false; // Clear validation tick while typing
    this._modelUrlInvalid = false;

    clearTimeout(this._modelUrlInputDebounceTimer);
    this._modelUrlInputDebounceTimer = window.setTimeout(() => {
      this._autoSave(
        input.value,
        {
          storageKey: "live2d-model-url",
          validator: this._validateLive2dUrl.bind(this),
          eventName: "model-url-changed",
          required: false,
          preserveOnEmpty: true,
        },
        "modelUrl",
      );
    }, 500);
  }

  private _autoSave(
    value: string,
    config: FieldConfig,
    fieldName: "apiKey" | "modelUrl",
  ): boolean {
    let isValid = false;

    if (!value && config.preserveOnEmpty && localStorage.getItem(config.storageKey)) {
      // Value exists, user cleared it, so we restore it and do nothing.
      const input =
        this.shadowRoot!.querySelector<HTMLInputElement>(`#${fieldName}`);
      if (input) {
        const oldValue = localStorage.getItem(config.storageKey)!;
        input.value = oldValue;
        if (fieldName === "apiKey") {
          this.apiKey = oldValue;
        }
      }
      this._setValidationState(fieldName, true);
      return true; // No-op, but validation is OK.
    }

    // If field is not required and empty, save empty value without validation
    if (!config.required && !value) {
      localStorage.setItem(config.storageKey, value);
      if (config.eventName) {
        this.dispatchEvent(new CustomEvent(config.eventName));
      }
      isValid = true;
    } else {
      // If validator exists, use it
      if (config.validator) {
        isValid = config.validator(value);
        if (!isValid) {
          // Validation failed, error should be set by validator
          this._setValidationState(fieldName, false);
          return false;
        }
      } else {
        isValid = true;
      }

      // Save to localStorage
      localStorage.setItem(config.storageKey, value);

      // Dispatch event if specified
      if (config.eventName) {
        this.dispatchEvent(new CustomEvent(config.eventName));
      }
    }

    // Update validation state
    this._setValidationState(fieldName, isValid);
    return isValid;
  }

  private _setValidationState(
    fieldName: "apiKey" | "modelUrl",
    isValid: boolean,
  ) {
    if (fieldName === "apiKey") {
      this._apiKeyValid = isValid;
      this._apiKeyInvalid = !isValid;
    } else if (fieldName === "modelUrl") {
      this._modelUrlValid = isValid;
      this._modelUrlInvalid = !isValid;
    }
  }

  private _onApiKeyBlur(e: Event) {
    const input = e.target as HTMLInputElement;
    // Just save and validate, don't dispatch the auto-close event on blur
    this._autoSave(
      input.value,
      {
        storageKey: "gemini-api-key",
        validator: this._validateApiKey.bind(this),
        eventName: undefined, // No auto-close on blur
        required: true,
        preserveOnEmpty: true,
      },
      "apiKey",
    );
  }

  private _onModelUrlBlur(e: Event) {
    const input = e.target as HTMLInputElement;
    this._autoSave(
      input.value,
      {
        storageKey: "live2d-model-url",
        validator: this._validateLive2dUrl.bind(this),
        eventName: "model-url-changed",
        required: false,
        preserveOnEmpty: true,
      },
      "modelUrl",
    );
  }

  private async _handlePaste(fieldName: "apiKey" | "modelUrl") {
    try {
      const text = await navigator.clipboard.readText();
      const input =
        this.shadowRoot!.querySelector<HTMLInputElement>(`#${fieldName}`);
      if (input) {
        input.value = text;

        if (fieldName === "apiKey") {
          this.apiKey = text;
          this._autoSave(
            text,
            {
              storageKey: "gemini-api-key",
              validator: this._validateApiKey.bind(this),
              eventName: undefined,
              required: true,
              preserveOnEmpty: true,
            },
            "apiKey",
          );
        } else { // modelUrl
          this._autoSave(
            text,
            {
              storageKey: "live2d-model-url",
              validator: this._validateLive2dUrl.bind(this),
              eventName: "model-url-changed",
              required: false,
              preserveOnEmpty: true,
            },
            "modelUrl",
          );
        }
      }
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  }

  private _onPaste() {
    this._handlePaste("apiKey");
  }

  private _onPasteModelUrl() {
    this._handlePaste("modelUrl");
  }

  private _validateApiKey(key: string): boolean {
    if (!key) {
      this._error = 'API key cannot be empty.';
      return false;
    }
    // Basic format validation
    if (!key.startsWith('AIzaSy') || key.length !== 39) {
      this._error = 'Invalid API key format.';
      return false;
    }
    return true;
  }

  private _validateLive2dUrl(url: string): boolean {
    if (!url) {
      // Empty is OK - will fallback to sphere
      return true;
    }

    try {
      const urlObj = new URL(url);

      // Check protocol - allow HTTP, HTTPS, IPFS, and blob
      const validProtocols = ["http:", "https:", "ipfs:", "blob:"];
      if (!validProtocols.includes(urlObj.protocol)) {
        this._error = "Live2D URL must use HTTP, HTTPS, IPFS, or blob protocol.";
        this.dispatchEvent(
          new CustomEvent("model-url-error", {
            detail: { error: this._error },
            bubbles: true,
            composed: true,
          }),
        );
        return false;
      }

      // For IPFS, basic format check
      if (urlObj.protocol === "ipfs:" && !urlObj.pathname) {
        this._error = "IPFS URL must include a valid hash.";
        this.dispatchEvent(
          new CustomEvent("model-url-error", {
            detail: { error: this._error },
            bubbles: true,
            composed: true,
          }),
        );
        return false;
      }

      // If it has a file extension, validate it's supported
      const pathname = urlObj.pathname.toLowerCase();
      const hasExtension = /\.[a-z0-9]+$/i.test(pathname);
      if (
        hasExtension &&
        !pathname.endsWith(".zip") &&
        !pathname.endsWith(".model3.json")
      ) {
        this._error = "If specified, file extension must be .zip or .model3.json";
        this.dispatchEvent(
          new CustomEvent("model-url-error", {
            detail: {
              error: this._error,
            },
            bubbles: true,
            composed: true,
          }),
        );
        return false;
      }

      // All other cases pass - let the Live2D loader handle it
      return true;
    } catch (err) {
      this._error = "Invalid URL format.";
      this.dispatchEvent(
        new CustomEvent("model-url-error", {
          detail: { error: this._error },
          bubbles: true,
          composed: true,
        }),
      );
      return false;
    }
  }

  private _getApiKeyUrl() {
    window.open("https://aistudio.google.com/apikey", "_blank");
  }
}
