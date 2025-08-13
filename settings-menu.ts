import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Persona, PersonaManager } from "./src/persona-manager";

interface FieldConfig {
  storageKey: string;
  validator?: (value: string) => boolean;
  eventName?: string;
  required?: boolean;
  preserveOnEmpty?: boolean;
}

/**
 * Applies circuitry animation settings from localStorage to the root element.
 * This function is called on module load to ensure settings are restored when
 * the application starts.
 */
function applyCircuitrySettingsOnLoad() {
  const root = document.documentElement;

  // Restore circuitry visibility
  const circuitryEnabled =
    localStorage.getItem("circuitry-enabled") !== "false";
  root.style.setProperty(
    "--circuit-display",
    circuitryEnabled ? "block" : "none",
  );
  root.setAttribute("data-circuit-enabled", circuitryEnabled.toString());

  // Restore animation speed
  const circuitrySpeed = localStorage.getItem("circuitry-speed") || "15";
  root.style.setProperty("--circuit-speed", `${circuitrySpeed}s`);

  // Restore pulsing nodes visibility
  const circuitryNodes = localStorage.getItem("circuitry-enabled") !== "false";
  root.style.setProperty(
    "--circuit-nodes-display",
    circuitryNodes ? "block" : "none",
  );
}

// Restore settings on page load
applyCircuitrySettingsOnLoad();

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

  @state()
  private _theme:
    | "cyberpunk"
    | "dystopia"
    | "tron"
    | "synthwave"
    | "matrix"
    | "noir" = (localStorage.getItem("theme") as any) || "cyberpunk";

  @state()
  private _circuitryEnabled: boolean =
    localStorage.getItem("circuitry-enabled") !== "false";

  @state()
  private _circuitrySpeed: number = parseInt(
    localStorage.getItem("circuitry-speed") || "15",
  );

  @state()
  private _personas: Persona[] = [];

  @state()
  private _activePersona: Persona | null = null;

  @state()
  private _editingPersona: Persona | null = null;

  private personaManager: PersonaManager;

  constructor() {
    super();
    this.personaManager = new PersonaManager();
    this._loadPersonas();
  }

  private _loadPersonas() {
    this._personas = this.personaManager.getPersonas();
    this._activePersona = this.personaManager.getActivePersona();
  }

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
      inset: 0;
      background: radial-gradient(800px 600px at 20% 20%, rgba(0,229,255,0.08), transparent 60%),
                  radial-gradient(800px 600px at 80% 80%, rgba(255,0,229,0.08), transparent 60%),
                  rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(2px);
    }
    .container {
      background: var(--cp-surface);
      color: var(--cp-text);
      padding: 1.5em;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 1em;
      width: 480px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      border: 1px solid var(--cp-surface-border);
      box-shadow: var(--cp-glow-purple);
      scrollbar-width: thin;
      scrollbar-color: var(--cp-surface-strong) var(--cp-surface);
    }

    /* Custom scrollbar styles for Webkit browsers */
    .container::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    .container::-webkit-scrollbar-track {
      background-color: var(--cp-surface);
      border-radius: 4px;
    }

    .container::-webkit-scrollbar-thumb {
      background-color: var(--cp-surface-strong);
      border-radius: 4px;
      border: 1px solid transparent;
      background-clip: content-box;
    }

    .container::-webkit-scrollbar-thumb:hover {
      background-color: var(--cp-cyan);
      box-shadow: var(--cp-glow-cyan);
    }
    h2 {
      color: var(--cp-text);
      margin: 0 0 0.5em 0;
    }
    label {
      color: var(--cp-muted);
      font-size: 0.9em;
    }
    .input-group {
      position: relative;
      display: flex;
      align-items: center;
    }
    input::placeholder {
      color: var(--cp-muted);
    }
    input,
    textarea,
    select {
      background: var(--cp-surface);
      border: 1px solid var(--cp-surface-border);
      color: var(--cp-text);
      padding: 0.5em 0.65em;
      border-radius: 8px;
      flex: 1;
      font-family: system-ui;
      box-shadow: var(--cp-glow-purple);
    }
    textarea {
      min-height: 60px;
      max-height: 40vh;
      height: auto;
      overflow-y: auto;
      resize: none;
      transition: height 0.1s ease;
      scrollbar-width: thin;
      scrollbar-color: var(--cp-surface-strong) transparent;
      line-height: 1.5;
    }
    
    textarea::-webkit-scrollbar {
      width: 6px;
    }
    
    textarea::-webkit-scrollbar-track {
      background: transparent;
    }
    
    textarea::-webkit-scrollbar-thumb {
      background-color: var(--cp-surface-strong);
      border-radius: 3px;
    }
    
    textarea::-webkit-scrollbar-thumb:hover {
      background-color: var(--cp-cyan);
    }
    input {
      padding-right: 5.5em;
    }
    select {
      cursor: pointer;
    }
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    input[type="checkbox"] {
      width: auto;
      margin: 0;
      padding: 0;
      cursor: pointer;
    }
    .range-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    input[type="range"] {
      flex: 1;
      cursor: pointer;
      height: 6px;
      background: var(--cp-surface);
      border-radius: 3px;
      outline: none;
      appearance: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(0,229,255,0.8), rgba(124,77,255,0.8));
      border: 2px solid var(--cp-surface-border);
      cursor: pointer;
      box-shadow: var(--cp-glow-cyan);
    }
    input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(0,229,255,0.8), rgba(124,77,255,0.8));
      border: 2px solid var(--cp-surface-border);
      cursor: pointer;
      box-shadow: var(--cp-glow-cyan);
    }
    .range-value {
      min-width: 40px;
      text-align: center;
      font-size: 0.9em;
      color: var(--cp-muted);
    }
    .paste-button {
      position: absolute;
      right: 0.5em;
      background: var(--cp-surface);
      border: 1px solid var(--cp-surface-border);
      color: var(--cp-muted);
      cursor: pointer;
      padding: 0.25em;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease, color 0.15s ease;
      box-shadow: var(--cp-glow-cyan);
    }
    .paste-button:hover {
      color: var(--cp-text);
      background: var(--cp-surface-strong);
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
      color: var(--cp-green);
    }
    .cross-icon {
      color: var(--cp-red);
    }
    .buttons {
      display: flex;
      gap: 1em;
      justify-content: flex-end;
    }
    button {
      outline: none;
      border: 1px solid var(--cp-surface-border);
      color: var(--cp-text);
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(0,229,255,0.15), rgba(124,77,255,0.15));
      padding: 0.5em 1em;
      cursor: pointer;
      transition: transform 0.15s ease, background 0.15s ease;
      box-shadow: var(--cp-glow-cyan);
    }
    button:hover {
      background: linear-gradient(135deg, rgba(0,229,255,0.22), rgba(124,77,255,0.22));
      transform: translateY(-1px);
    }
    .error {
      color: var(--cp-red);
      font-size: 0.9em;
    }
    details {
      border: 1px solid var(--cp-surface-border);
      border-radius: 8px;
      padding: 0.5em 0.65em;
      margin-top: 1em;
      box-shadow: var(--cp-glow-purple);
    }
    summary {
      cursor: pointer;
      color: var(--cp-text);
      font-weight: 500;
      list-style-position: inside;
    }
    details[open] summary {
      margin-bottom: 1em;
    }
    details .checkbox-group,
    details .range-group {
      margin-left: 1em;
      margin-bottom: 1em;
    }
    details label {
      margin-left: 1em;
    }

    .theme-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5em;
      margin-bottom: 0.5em;
    }

    .theme-button {
      outline: none;
      border: 1px solid var(--cp-surface-border);
      color: var(--cp-text);
      border-radius: 8px;
      background: var(--cp-surface);
      padding: 0.4em 0.8em;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: none;
      font-size: 0.9em;
    }

    .theme-button:hover {
      background: var(--cp-surface-strong);
      transform: translateY(-1px);
      box-shadow: var(--cp-glow-cyan);
    }

    .theme-button.active {
      background: linear-gradient(135deg, rgba(0,229,255,0.15), rgba(124,77,255,0.15));
      border-color: var(--cp-cyan);
      box-shadow: var(--cp-glow-cyan);
    }

    .theme-button.active:hover {
      background: linear-gradient(135deg, rgba(0,229,255,0.22), rgba(124,77,255,0.22));
    }
    
    .prompt-section {
      display: flex;
      flex-direction: column;
      gap: 0.5em;
      border-top: 1px solid var(--cp-surface-border);
      padding-top: 1em;
      margin-top: 0.5em;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5em;
    }
    
    .section-title {
      font-weight: 500;
      color: var(--cp-text);
      display: flex;
      align-items: center;
      gap: 0.5em;
    }
    
    .prompt-icon {
      width: 18px;
      height: 18px;
      opacity: 0.8;
    }

    .persona-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5em;
    }

    .persona-button {
      outline: none;
      border: 1px solid var(--cp-surface-border);
      color: var(--cp-text);
      border-radius: 8px;
      background: var(--cp-surface);
      padding: 0.4em 0.8em;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: none;
      font-size: 0.9em;
    }

    .persona-button:hover {
      background: var(--cp-surface-strong);
      transform: translateY(-1px);
      box-shadow: var(--cp-glow-cyan);
    }

    .persona-button.active {
      background: linear-gradient(135deg, rgba(0,229,255,0.15), rgba(124,77,255,0.15));
      border-color: var(--cp-cyan);
      box-shadow: var(--cp-glow-cyan);
    }
    .persona-editor {
      display: flex;
      flex-direction: column;
      gap: 1em;
      border-top: 1px solid var(--cp-surface-border);
      padding-top: 1em;
      margin-top: 1em;
    }
  `;

  private _renderPersonaForm() {
    if (!this._editingPersona) {
      return html``;
    }

    return html`
      <div class="persona-editor">
        <input
          type="text"
          .value=${this._editingPersona.name}
          @input=${(e: Event) =>
            this._handlePersonaFormInput(
              "name",
              (e.target as HTMLInputElement).value,
            )}
        />
        <textarea
          .value=${this._editingPersona.systemPrompt}
          @input=${(e: Event) =>
            this._handlePersonaFormInput(
              "systemPrompt",
              (e.target as HTMLTextAreaElement).value,
            )}
          placeholder="System Prompt"
        ></textarea>
        <div class="input-group">
          <input
            type="text"
            .value=${this._editingPersona.live2dModelUrl}
            @input=${(e: Event) => {
              this._handlePersonaFormInput(
                "live2dModelUrl",
                (e.target as HTMLInputElement).value,
              );
              this._validateLive2dUrl((e.target as HTMLInputElement).value);
            }}
            placeholder="Live2D Model URL"
          />
          <div
            class="validation-icon ${
              this._modelUrlValid || this._modelUrlInvalid ? "show" : ""
            }"
            title="${this._modelUrlValid ? "Valid URL" : "Invalid URL"}"
          >
            ${
              this._modelUrlValid
                ? html`<svg
                  class="tick-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"
                  />
                </svg>`
                : this._modelUrlInvalid
                  ? html`<svg
                    class="cross-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
                    />
                  </svg>`
                  : ""
            }
          </div>
          <button
            class="paste-button"
            @click=${() => this._handlePaste("modelUrl")}
            title="Paste from clipboard"
          >
            <svg class="paste-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3"
              />
            </svg>
          </button>
        </div>
        <button @click=${this._onSavePersona}>Save</button>
        <button @click=${() => (this._editingPersona = null)}>Cancel</button>
      </div>
    `;
  }

  private _handlePersonaFormInput(field: keyof Persona, value: string) {
    if (this._editingPersona) {
      this._editingPersona = { ...this._editingPersona, [field]: value };
    }
  }

  private _onSavePersona() {
    if (this._editingPersona) {
      this.personaManager.updatePersona(this._editingPersona);
      this._loadPersonas();
      this._editingPersona = null;
      this.requestUpdate();
    }
  }

  render() {
    return html`
      <div class="backdrop" @click=${this._handleBackdropClick}>
        <div class="container" @click=${this._stopPropagation}>
          <h2>Settings</h2>

          <label for="theme">Theme</label>
          <div class="theme-buttons">
            ${[
              "cyberpunk",
              "dystopia",
              "tron",
              "synthwave",
              "matrix",
              "noir",
            ].map(
              (theme) => html`
                <button
                  class="theme-button ${this._theme === theme ? "active" : ""}"
                  @click=${() => this._onThemeChange(theme as any)}
                >
                  ${theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              `,
            )}
          </div>

          <details>
            <summary>UI</summary>
            <label for="circuitryEnabled">Circuitry Animation</label>
            <div class="checkbox-group">
              <input
                id="circuitryEnabled"
                type="checkbox"
                .checked=${this._circuitryEnabled}
                @change=${this._onCircuitryEnabledChange}
              />
              <label for="circuitryEnabled">Enable animated circuitry background</label>
            </div>

            <label for="circuitrySpeed">Animation Speed (seconds)</label>
            <div class="range-group">
              <input
                id="circuitrySpeed"
                type="range"
                min="5"
                max="30"
                step="1"
                .value=${this._circuitrySpeed.toString()}
                @input=${this._onCircuitrySpeedChange}
                ?disabled=${!this._circuitryEnabled}
              />
              <span class="range-value">${this._circuitrySpeed}s</span>
            </div>
          </details>

          <div class="prompt-section">
            <div class="section-header">
              <label class="section-title">
                <svg class="prompt-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                  <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80q17 0 28.5-11.5T520-680q0-17-11.5-28.5T480-720q-17 0-28.5 11.5T440-680q0 17 11.5 28.5T480-640Zm0 240Z"/>
                </svg>
                Persona Management
              </label>
              <button @click=${this._onCreatePersona}>+</button>
            </div>
            <div class="persona-list">
              ${this._personas.map(
                (persona) => html`
                  <button
                    class="persona-button ${
                      this._activePersona?.id === persona.id ? "active" : ""
                    }"
                    @click=${() => this._onSelectPersona(persona.id)}
                  >
                    ${persona.name}
                  </button>
                `,
              )}
            </div>
            ${this._renderPersonaForm()}
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
              ${
                this._apiKeyValid
                  ? html`<svg class="tick-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/></svg>`
                  : this._apiKeyInvalid
                    ? html`<svg class="cross-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>`
                    : ""
              }
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
    `;
  }

  firstUpdated() {
    this.shadowRoot!.host.setAttribute("active", "true");

    // Initialize theme select and apply current theme
    const select = this.shadowRoot!.querySelector<HTMLSelectElement>("#theme");
    if (select) {
      select.value = this._theme;
    }
    this._applyTheme(this._theme);
    this._applyCircuitrySettings();

    // Validate API Key, but only if it has a value
    if (this.apiKey) {
      const isApiKeyValid = this._validateApiKey(this.apiKey);
      this._setValidationState("apiKey", isApiKeyValid);
    }

    // Store reference to system prompt textarea and set initial height
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
          eventName: "api-key-changed",
          required: true,
          preserveOnEmpty: true,
        },
        "apiKey",
      );
    }, 500); // 500ms debounce
  }

  private _autoSave(
    value: string,
    config: FieldConfig,
    fieldName: "apiKey",
  ): boolean {
    let isValid = false;

    if (
      !value &&
      config.preserveOnEmpty &&
      localStorage.getItem(config.storageKey)
    ) {
      // Value exists, user cleared it, so we restore it and preserve in storage
      const input = this.shadowRoot!.querySelector<HTMLInputElement>(
        `#${fieldName}`,
      );
      if (input) {
        const oldValue = localStorage.getItem(config.storageKey)!;
        input.value = oldValue;
        if (fieldName === "apiKey") {
          this.apiKey = oldValue;
        }
      }

      if (config.required) {
        this._error = "API key cannot be empty";
        this._setValidationState(fieldName, false);
      } else {
        this._setValidationState(fieldName, true);
      }
      return !config.required;
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
    // Save and validate, emit api-key-changed event for client reinitialization
    this._autoSave(
      input.value,
      {
        storageKey: "gemini-api-key",
        validator: this._validateApiKey.bind(this),
        eventName: "api-key-changed",
        required: true,
        preserveOnEmpty: true,
      },
      "apiKey",
    );
  }

  private async _handlePaste(fieldName: "apiKey" | "modelUrl") {
    try {
      const text = await navigator.clipboard.readText();
      const input = this.shadowRoot!.querySelector<HTMLInputElement>(
        `#${fieldName}`,
      );
      if (input) {
        input.value = text;

        if (fieldName === "apiKey") {
          this.apiKey = text;
          this._autoSave(
            text,
            {
              storageKey: "gemini-api-key",
              validator: this._validateApiKey.bind(this),
              eventName: "api-key-changed",
              required: true,
              preserveOnEmpty: true,
            },
            "apiKey",
          );
        } else {
          if (this._editingPersona) {
            this._editingPersona = {
              ...this._editingPersona,
              live2dModelUrl: text,
            };
            this._validateLive2dUrl(text);
            this.requestUpdate();
          }
        }
      }
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  }

  private _onPaste() {
    this._handlePaste("apiKey");
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

  private _validateLive2dUrl(url: string): boolean {
    const isValid = this._checkLive2dUrl(url);
    this._setValidationState("modelUrl", isValid);
    return isValid;
  }

  private _checkLive2dUrl(url: string): boolean {
    if (!url) {
      // Empty is OK - will fallback to sphere
      return true;
    }

    try {
      const urlObj = new URL(url);

      // Check protocol - allow HTTP, HTTPS, IPFS, and blob
      const validProtocols = ["http:", "https:", "ipfs:", "blob:"];
      if (!validProtocols.includes(urlObj.protocol)) {
        this._error =
          "Live2D URL must use HTTP, HTTPS, IPFS, or blob protocol.";
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
        this._error =
          "If specified, file extension must be .zip or .model3.json";
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

  private _applyTheme(
    theme: "cyberpunk" | "dystopia" | "tron" | "synthwave" | "matrix" | "noir",
  ) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  private _onThemeChange(
    theme: "cyberpunk" | "dystopia" | "tron" | "synthwave" | "matrix" | "noir",
  ) {
    this._theme = theme;
    localStorage.setItem("theme", theme);
    this._applyTheme(theme);
  }

  private _applyCircuitrySettings() {
    const root = document.documentElement;

    // Controls visibility of the entire circuitry effect.
    root.style.setProperty(
      "--circuit-display",
      this._circuitryEnabled ? "block" : "none",
    );

    // Controls animation duration.
    root.style.setProperty("--circuit-speed", `${this._circuitrySpeed}s`);

    // Controls visibility of intersection nodes.
    root.style.setProperty(
      "--circuit-nodes-display",
      this._circuitryEnabled ? "block" : "none",
    );

    // This data attribute can be used for more complex CSS selectors if needed.
    root.setAttribute(
      "data-circuit-enabled",
      this._circuitryEnabled.toString(),
    );
  }

  private _onCircuitryEnabledChange(e: Event) {
    const checkbox = e.target as HTMLInputElement;
    this._circuitryEnabled = checkbox.checked;
    localStorage.setItem(
      "circuitry-enabled",
      this._circuitryEnabled.toString(),
    );
    this._applyCircuitrySettings();
  }

  private _onCircuitrySpeedChange(e: Event) {
    const range = e.target as HTMLInputElement;
    this._circuitrySpeed = parseInt(range.value);
    localStorage.setItem("circuitry-speed", this._circuitrySpeed.toString());
    this._applyCircuitrySettings();
  }

  private _onCreatePersona() {
    const newPersona = this.personaManager.createPersona("New Persona");
    this._loadPersonas();
    this._editingPersona = newPersona;
    this.requestUpdate();
  }

  private _onSelectPersona(personaId: string) {
    this.personaManager.setActivePersona(personaId);
    this._activePersona = this.personaManager.getActivePersona();
    this._editingPersona = this._activePersona;
    this.requestUpdate();
  }
}
