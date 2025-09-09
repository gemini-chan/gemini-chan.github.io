import { type Persona, PersonaManager } from "@features/persona/PersonaManager";
import "./Live2DModelMapper";
import { Live2DMappingService } from "@services/Live2DMappingService";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

interface FieldConfig {
  storageKey: string;
  validator?: (value: string) => boolean;
  eventName?: string;
  required?: boolean;
  preserveOnEmpty?: boolean;
}

// Theme system types and data
type ThemeType =
  | "cyberpunk"
  | "dystopia"
  | "tron"
  | "synthwave"
  | "matrix"
  | "noir";

interface ThemePreview {
  primary: string;
  secondary: string;
  gradient: string;
  name: string;
}

// Theme preview data with color gradients for visual representation
const THEME_PREVIEWS: Record<ThemeType, ThemePreview> = {
  cyberpunk: {
    primary: "#00e5ff",
    secondary: "#ff00e5",
    gradient: "linear-gradient(135deg, #00e5ff 0%, #7c4dff 50%, #ff00e5 100%)",
    name: "Cyberpunk",
  },
  dystopia: {
    primary: "#23d5ff",
    secondary: "#6a4cff",
    gradient: "linear-gradient(135deg, #23d5ff 0%, #6a4cff 50%, #b400ff 100%)",
    name: "Dystopia",
  },
  tron: {
    primary: "#00f0ff",
    secondary: "#00bfff",
    gradient: "linear-gradient(135deg, #00f0ff 0%, #00bfff 50%, #33ffd6 100%)",
    name: "Tron",
  },
  synthwave: {
    primary: "#ff00a8",
    secondary: "#a96dff",
    gradient: "linear-gradient(135deg, #ff00a8 0%, #a96dff 50%, #ff6b9d 100%)",
    name: "Synthwave",
  },
  matrix: {
    primary: "#39ff14",
    secondary: "#00ff41",
    gradient: "linear-gradient(135deg, #39ff14 0%, #00ff41 50%, #7fff00 100%)",
    name: "Matrix",
  },
  noir: {
    primary: "#ff4757",
    secondary: "#ff3838",
    gradient: "linear-gradient(135deg, #ff4757 0%, #ff3838 50%, #ff6b7a 100%)",
    name: "Noir",
  },
};

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
    | "noir" = (localStorage.getItem("theme") as ThemeType) || "cyberpunk";

  @state()
  private _circuitryEnabled: boolean =
    localStorage.getItem("circuitry-enabled") !== "false";

  @state()
  private _circuitrySpeed: number = Number.parseInt(
    localStorage.getItem("circuitry-speed") || "15",
  );

  @state()
  private _themeOptionsOpen = false;

  @state()
  private _personas: Persona[] = [];

  @state()
  private _activePersona: Persona | null = null;

  @state()
  private _editingPersona: Persona | null = null;

  @state()
  private _showDeleteConfirmation = false;

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
    /* Enhanced Design Tokens */
    :host {
      --theme-card-width: 90px;
      --theme-card-height: 60px;
      --theme-card-radius: 8px;
      --theme-card-border: 1px;
      --theme-card-spacing: 8px;

      --animation-duration-fast: 0.15s;
      --animation-duration-medium: 0.25s;
      --animation-easing: cubic-bezier(0.4, 0, 0.2, 1);

      --shadow-subtle: 0 2px 8px rgba(0, 0, 0, 0.1);
      --shadow-elevated: 0 4px 16px rgba(0, 0, 0, 0.15);
      --shadow-theme-glow: 0 0 0 2px var(--theme-accent), 0 4px 16px var(--theme-accent-alpha);

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
      gap: 12px;
    }
    
    /* Custom Checkbox Styling */
    input[type="checkbox"] {
      appearance: none;
      width: 20px;
      height: 20px;
      border: 2px solid var(--cp-surface-border);
      border-radius: 4px;
      background: var(--cp-surface);
      cursor: pointer;
      position: relative;
      transition: all var(--animation-duration-fast) var(--animation-easing);
      margin: 0;
      padding: 0;
      flex: none;
      flex-shrink: 0;
    }

    input[type="checkbox"]:hover {
      border-color: var(--cp-cyan);
      box-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
    }

    input[type="checkbox"]:checked {
      background: linear-gradient(135deg, var(--cp-cyan), var(--cp-purple));
      border-color: var(--cp-cyan);
      box-shadow: var(--cp-glow-cyan);
    }

    input[type="checkbox"]:checked::after {
      content: '';
      position: absolute;
      left: 6px;
      top: 2px;
      width: 6px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    input[type="checkbox"]:focus {
      outline: 2px solid var(--cp-cyan);
      outline-offset: 2px;
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
      border-radius: 8px;
      background: var(--cp-surface);
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      font-weight: 500;
      transition: all var(--animation-duration-fast) var(--animation-easing);
      position: relative;
      overflow: hidden;
    }
    
    button:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-elevated);
    }

    button:focus {
      outline: 2px solid var(--cp-cyan);
      outline-offset: 2px;
    }

    button.primary {
      background: linear-gradient(135deg, var(--cp-cyan), var(--cp-purple));
      border-color: var(--cp-cyan);
      color: #000;
      font-weight: 600;
    }

    button.primary:hover {
      box-shadow: 0 4px 16px rgba(0, 229, 255, 0.3);
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

    /* Theme Selection Section */
    .theme-selection-section {
      margin-bottom: 1.5rem;
    }

    .section-label {
      display: block;
      margin-bottom: 1rem;
      font-weight: 500;
      color: var(--cp-text);
    }

    /* Theme Grid Layout */
    .theme-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(var(--theme-card-width), 1fr));
      gap: var(--theme-card-spacing);
      margin-bottom: 1rem;
    }

    /* Theme Card Styling */
    .theme-card {
      position: relative;
      width: var(--theme-card-width);
      height: var(--theme-card-height);
      border-radius: var(--theme-card-radius);
      border: var(--theme-card-border) solid var(--cp-surface-border);
      background: var(--cp-surface);
      cursor: pointer;
      transition: all var(--animation-duration-medium) var(--animation-easing);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      outline: none;
    }

    .theme-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-elevated);
      border-color: var(--theme-accent);
    }

    .theme-card:focus {
      outline: 2px solid var(--theme-accent);
      outline-offset: 2px;
    }

    .theme-card.active {
      border-color: var(--theme-accent);
      box-shadow: var(--shadow-theme-glow);
    }

    .theme-card.active:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 0 2px var(--theme-accent), 0 6px 20px var(--theme-accent-alpha);
    }

    .theme-card.editing-mode:not(.active) {
      opacity: 0.6;
      transform: scale(0.98);
    }

    /* Theme Preview Area */
    .theme-preview {
      flex: 1;
      background: var(--theme-gradient);
      position: relative;
    }

    .theme-preview::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, transparent 0%, rgba(0,0,0,0.1) 100%);
    }

    /* Theme Label */
    .theme-label {
      padding: 0.5rem;
      font-size: 0.85rem;
      font-weight: 500;
      text-align: center;
      background: var(--cp-surface-strong);
      color: var(--cp-text);
      border-top: 1px solid var(--cp-surface-border);
    }

    /* Active Theme Indicator */
    .active-indicator {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      background: var(--theme-accent);
      box-shadow: 0 0 8px var(--theme-accent);
      z-index: 1;
    }

    /* Theme Controls */
    .theme-controls {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding: 1rem 0;
      border-top: 1px solid var(--cp-surface-border);
      margin-top: 1rem;
    }

    .control-button {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      border: 1px solid var(--cp-surface-border);
      background: var(--cp-surface);
      color: var(--cp-text);
      font-weight: 500;
      cursor: pointer;
      transition: all var(--animation-duration-fast) var(--animation-easing);
      position: relative;
      overflow: hidden;
      outline: none;
    }

    .control-button.primary {
      background: linear-gradient(135deg, var(--cp-cyan), var(--cp-purple));
      border-color: var(--cp-cyan);
      color: white;
    }

    .control-button:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-elevated);
    }

    .control-button.primary:hover {
      box-shadow: 0 4px 16px rgba(0, 229, 255, 0.3);
    }

    .control-button:focus {
      outline: 2px solid var(--cp-cyan);
      outline-offset: 2px;
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

    .theme-editor {
      display: flex;
      flex-direction: column;
      gap: 1em;
      border-top: 1px solid var(--cp-surface-border);
      padding-top: 1em;
      margin-top: 1em;
    }

    /* Micro-interactions and Animations */
    @keyframes theme-card-select {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }

    @keyframes glow-pulse {
      0%, 100% { 
        box-shadow: var(--shadow-theme-glow);
      }
      50% { 
        box-shadow: 0 0 0 2px var(--theme-accent), 0 6px 20px var(--theme-accent-alpha);
      }
    }

    @keyframes active-indicator-pulse {
      0%, 100% { 
        transform: scale(1);
        opacity: 1;
      }
      50% { 
        transform: scale(1.1);
        opacity: 0.8;
      }
    }

    /* Enhanced Active States */
    .theme-card.active {
      animation: glow-pulse 3s ease-in-out infinite;
    }

    .theme-card:active {
      animation: theme-card-select 0.2s ease-out;
    }

    .active-indicator {
      animation: active-indicator-pulse 2s ease-in-out infinite;
    }

    /* Smooth Transitions for All Interactive Elements */
    .theme-card,
    .control-button,
    .theme-preview {
      transition: all var(--animation-duration-medium) var(--animation-easing);
    }

    /* Enhanced Hover Effects */
    .theme-card:hover .theme-preview::after {
      background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 100%);
    }

    .theme-card:hover .active-indicator {
      transform: scale(1.1);
      box-shadow: 0 0 12px var(--theme-accent);
    }

    /* Responsive Design */
    @media (max-width: 480px) {
      :host {
        --theme-card-width: 80px;
        --theme-card-height: 50px;
        --theme-card-spacing: 6px;
      }
      
      .theme-label {
        font-size: 0.75rem;
        padding: 0.4rem;
      }
    }

    /* Theme Options Styling */
    .theme-options-section {
      margin-top: 1rem;
    }

    .theme-options-details {
      border: 1px solid var(--cp-surface-border);
      border-radius: 8px;
      background: var(--cp-surface);
      overflow: hidden;
    }

    .theme-options-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      cursor: pointer;
      list-style: none;
      user-select: none;
      transition: background-color var(--animation-duration-fast) var(--animation-easing);
    }

    .theme-options-summary:hover {
      background: var(--cp-surface-strong);
    }

    .theme-options-summary::-webkit-details-marker {
      display: none;
    }

    .summary-text {
      font-weight: 500;
      color: var(--cp-text);
    }

    .chevron-icon {
      width: 16px;
      height: 16px;
      color: var(--cp-muted);
      transition: transform var(--animation-duration-fast) var(--animation-easing);
    }

    .theme-options-details[open] .chevron-icon {
      transform: rotate(180deg);
    }

    .theme-options-content {
      padding: 1rem;
      border-top: 1px solid var(--cp-surface-border);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    /* API Key Priority Section */
    .api-key-section {
      margin-bottom: 2rem;
      padding: 1rem;
      border: 2px solid var(--cp-cyan);
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(0, 229, 255, 0.05), rgba(124, 77, 255, 0.05));
      box-shadow: var(--cp-glow-cyan);
    }

    .section-label.priority {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: var(--cp-cyan);
      font-size: 1rem;
      margin-bottom: 1rem;
    }

    .priority-icon {
      width: 20px;
      height: 20px;
      color: var(--cp-cyan);
    }

    .api-key-buttons {
      margin-top: 1rem;
      display: flex;
      gap: 1rem;
      justify-content: flex-start;
    }

    .persona-form-buttons {
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      padding: 1rem 0;
      border-top: 1px solid var(--cp-surface-border);
      margin-top: 1rem;
    }

    .persona-form-buttons .right-buttons {
      display: flex;
      gap: 1rem;
    }

    button.danger {
      background: linear-gradient(135deg, var(--cp-red), #ff6b7a);
      border-color: var(--cp-red);
      color: white;
      font-weight: 600;
    }

    button.danger:hover {
      box-shadow: 0 4px 16px rgba(255, 71, 87, 0.3);
    }

    /* Confirmation Dialog Styles */
    .confirmation-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .confirmation-content {
      background: var(--cp-surface);
      color: var(--cp-text);
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid var(--cp-surface-border);
      box-shadow: var(--cp-glow-purple);
      max-width: 400px;
      width: 90vw;
      text-align: center;
    }

    .confirmation-title {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--cp-red);
    }

    .confirmation-message {
      margin-bottom: 2rem;
      line-height: 1.5;
      color: var(--cp-muted);
    }

    .confirmation-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    /* Accessibility Enhancements */
    @media (prefers-reduced-motion: reduce) {
      .theme-card,
      .control-button,
      .theme-preview,
      .active-indicator,
      .chevron-icon {
        animation: none;
        transition: none;
      }
    }
  `;

  private _renderPersonaForm() {
    if (!this._editingPersona) {
      return html``;
    }

    // Get available emotions for the current model URL
    const emotions = this._editingPersona.live2dModelUrl 
      ? Live2DMappingService.getAvailableEmotions(this._editingPersona.live2dModelUrl)
      : [];

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
          @blur=${() => this._onSavePersona()}
        />
        <textarea
          .value=${this._editingPersona.systemPrompt}
          @input=${(e: Event) =>
            this._handlePersonaFormInput(
              "systemPrompt",
              (e.target as HTMLTextAreaElement).value,
            )}
          @blur=${() => this._onSavePersona()}
          placeholder="System Prompt"
        ></textarea>
        
        <!-- Emotion Selection Dropdown -->
        ${this._editingPersona.live2dModelUrl && emotions.length > 0 ? html`
          <div class="input-group">
            <select
              .value=${this._editingPersona.emotion || ""}
              @change=${(e: Event) => {
                const select = e.target as HTMLSelectElement;
                this._handlePersonaFormInput("emotion", select.value || undefined);
                this._onSavePersona();
              }}
            >
              <option value="">Default Emotion</option>
              ${emotions.map(
                (emotion) => html`
                  <option 
                    value="${emotion}" 
                    ?selected=${this._editingPersona?.emotion === emotion}
                  >
                    ${emotion}
                  </option>
                `
              )}
            </select>
          </div>
        ` : this._editingPersona.live2dModelUrl ? html`
          <div style="margin-top: 1em; padding: 0.5em; background: var(--cp-surface-strong); border-radius: 8px; border: 1px solid var(--cp-surface-border);">
            <p style="margin: 0; font-size: 0.9em; color: var(--cp-muted);">
              No emotions available for this model.
            </p>
          </div>
        ` : html`
          <div style="margin-top: 1em; padding: 0.5em; background: var(--cp-surface-strong); border-radius: 8px; border: 1px solid var(--cp-surface-border);">
            <p style="margin: 0; font-size: 0.9em; color: var(--cp-muted);">
              Set a Live2D model URL above to enable emotion selection.
            </p>
          </div>
        `}
        
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
            @blur=${() => this._onSavePersona()}
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
        
        ${this._editingPersona.live2dModelUrl ? html`
        <details style="margin-top: 1em;">
          <summary>Live2D Mapping (per model)</summary>
          <div style="margin-top: 12px;">
            <live2d-model-mapper .modelUrl=${this._editingPersona.live2dModelUrl}></live2d-model-mapper>
          </div>
        </details>
        ` : html`
          <div style="margin-top: 1em; padding: 0.5em; background: var(--cp-surface-strong); border-radius: 8px; border: 1px solid var(--cp-surface-border);">
            <p style="margin: 0; font-size: 0.9em; color: var(--cp-muted);">
              Set a Live2D model URL above to enable emotion mapping configuration.
            </p>
          </div>
        `}
        ${
          !this._editingPersona.isDefault
            ? html`
          <div style="margin-top: 1em;">
            <button class="danger" @click=${this._onDeletePersona}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem;">
                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
              </svg>
              Delete Persona
            </button>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  private _handlePersonaFormInput(field: keyof Persona, value: string | boolean | undefined) {
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

  private _cancelPersonaEdit() {
    this._editingPersona = null;
    this.requestUpdate();
  }

  private _onDeletePersona() {
    this._showDeleteConfirmation = true;
    this.requestUpdate();
  }

  private _confirmDeletePersona() {
    if (this._editingPersona && !this._editingPersona.isDefault) {
      const wasActive = this._activePersona?.id === this._editingPersona.id;
      const personaToDelete = this._editingPersona;

      // Close dialogs first to prevent UI flickering
      this._editingPersona = null;
      this._showDeleteConfirmation = false;

      // Delete the persona
      this.personaManager.deletePersona(personaToDelete.id);

      // If we deleted the active persona, switch to default VTuber persona
      if (wasActive) {
        const defaultPersona = this.personaManager
          .getPersonas()
          .find((p) => p.isDefault);
        if (defaultPersona) {
          // Use setTimeout to ensure proper sequencing and prevent race conditions
          setTimeout(() => {
            this.personaManager.setActivePersona(defaultPersona.id);
            // The persona-changed event will trigger the main app update
            // We just need to reload our local state
            this._loadPersonas();
            this.requestUpdate();
          }, 50);
          return; // Don't call requestUpdate immediately
        }
      }

      // If we didn't delete the active persona, just reload the list
      this._loadPersonas();
      this.requestUpdate();
    }
  }

  private _cancelDeletePersona() {
    this._showDeleteConfirmation = false;
    this.requestUpdate();
  }

  private _renderDeleteConfirmation() {
    if (!this._editingPersona) return html``;

    return html`
      <div class="confirmation-dialog" @click=${this._cancelDeletePersona}>
        <div class="confirmation-content" @click=${(e: Event) => e.stopPropagation()}>
          <div class="confirmation-title">Delete Persona</div>
          <div class="confirmation-message">
            Are you sure you want to delete "${this._editingPersona.name}"? This action cannot be undone.
            ${
              this._activePersona?.id === this._editingPersona.id
                ? html`<br><br><strong>Note:</strong> This is your currently active persona. You will be switched to the default VTuber persona.`
                : ""
            }
          </div>
          <div class="confirmation-buttons">
            <button @click=${this._cancelDeletePersona}>Cancel</button>
            <button class="danger" @click=${this._confirmDeletePersona}>Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  private _formatThemeName(theme: ThemeType): string {
    return THEME_PREVIEWS[theme].name;
  }

  private _renderThemeCard(theme: ThemeType, preview: ThemePreview) {
    const isActive = this._theme === theme;
    return html`
      <div
        class="theme-card ${isActive ? "active" : ""}"
        role="button"
        tabindex="0"
        aria-label="Select ${this._formatThemeName(theme)} theme"
        aria-pressed="${isActive}"
        @click=${() => this._onThemeSelect(theme)}
        @keydown=${this._handleThemeCardKeydown}
        style="--theme-gradient: ${preview.gradient}; --theme-accent: ${preview.primary}; --theme-accent-alpha: ${preview.primary}40"
      >
        <div class="theme-preview" style="background: ${preview.gradient}"></div>
        <div class="theme-label">${this._formatThemeName(theme)}</div>
        ${isActive ? html`<div class="active-indicator"></div>` : ""}
      </div>
    `;
  }

  private _renderThemeSelection() {
    return html`
      <div class="theme-selection-section">
        <label class="section-label">Theme</label>
        <div class="theme-grid">
          ${Object.entries(THEME_PREVIEWS).map(([themeKey, preview]) =>
            this._renderThemeCard(themeKey as ThemeType, preview),
          )}
        </div>
        ${this._renderThemeOptions()}
      </div>
    `;
  }

  private _renderThemeOptions() {
    return html`
      <div class="theme-options-section">
        <details class="theme-options-details" .open=${this._themeOptionsOpen} @toggle=${this._handleThemeOptionsToggle}>
          <summary class="theme-options-summary">
            <span class="summary-text">Theme Options</span>
            <svg class="chevron-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
            </svg>
          </summary>
          <div class="theme-options-content">
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
          </div>
        </details>
      </div>
    `;
  }

  private _handleThemeCardKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const target = e.target as HTMLElement;
      target.click();
    } else if (
      e.key === "ArrowRight" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown"
    ) {
      e.preventDefault();
      this._navigateThemeCards(e.key, e.target as HTMLElement);
    }
  }

  private _navigateThemeCards(key: string, currentElement: HTMLElement) {
    const themeCards = Array.from(
      this.shadowRoot?.querySelectorAll(".theme-card"),
    ) as HTMLElement[];
    const currentIndex = themeCards.indexOf(currentElement);

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % themeCards.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + themeCards.length) % themeCards.length;
        break;
    }

    if (nextIndex !== currentIndex) {
      themeCards[nextIndex].focus();
    }
  }

  private _onThemeSelect(theme: ThemeType) {
    this._theme = theme;
    this._applyTheme(theme);
    localStorage.setItem("theme", theme);
    this._themeOptionsOpen = true;
  }

  private _handleThemeOptionsToggle(e: Event) {
    this._themeOptionsOpen = (e.target as HTMLDetailsElement).open;
  }

  render() {
    return html`
      <div class="backdrop" @click=${this._handleBackdropClick}>
        <div class="container" @click=${this._stopPropagation}>
          <h2>Settings</h2>

          <div class="api-key-section">
            <label class="section-label priority">
              <svg class="priority-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,7H13V9H11V7M11,11H13V17H11V11Z"/>
              </svg>
              API Key
            </label>
            <div class="input-group">
              <input
                id="apiKey"
                type="password"
                .value=${this.apiKey}
                @input=${this._onApiKeyInput}
                @blur=${this._onApiKeyBlur}
                placeholder="Enter your Gemini API Key" />
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
            <div class="api-key-buttons">
              <button @click=${this._getApiKeyUrl}>Get API Key</button>
            </div>
          </div>

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

          ${this._renderThemeSelection()}

      </div>
      
      ${this._showDeleteConfirmation ? this._renderDeleteConfirmation() : ""}
    `;
  }

  firstUpdated() {
    this.shadowRoot?.host.setAttribute("active", "true");

    // Initialize theme select and apply current theme
    const select = this.shadowRoot?.querySelector<HTMLSelectElement>("#theme");
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
      localStorage.setItem("theme", this._theme);
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
      const input = this.shadowRoot?.querySelector<HTMLInputElement>(
        `#${fieldName}`,
      );
      if (input) {
        const oldValue = localStorage.getItem(config.storageKey) ?? "";
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
      const input = this.shadowRoot?.querySelector<HTMLInputElement>(
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
    } catch {
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
    this._circuitrySpeed = Number.parseInt(range.value);
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
