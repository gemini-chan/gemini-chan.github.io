import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("toast-notification")
export class ToastNotification extends LitElement {
  @property({ type: Boolean })
  visible = false;

  @property({ type: String })
  message = "";

  @property({ type: String })
  type: "info" | "success" | "warning" | "error" = "info";

  // Screen position for the toast
  @property({ type: String, reflect: true })
  position: "top-center" | "bottom-center" | "top-right" | "bottom-right" = "top-center";

  // Visual variant (inline = lighter surface, used over Live2D center bottom)
  @property({ type: String, reflect: true })
  variant: "standard" | "inline" = "standard";

  @state()
  private _isAnimating = false;

  static styles = css`
    :host {
      /* Theming hooks */
      --toast-bg: var(--cp-surface);
      --toast-bg-strong: var(--cp-surface-strong);
      --toast-border: var(--cp-surface-border);
      --toast-text: var(--cp-text);
      --toast-shadow-info: var(--cp-glow-cyan);
      --toast-shadow-warn: var(--cp-glow-magenta);

      position: fixed;
      z-index: 60;
      pointer-events: none;
    }

    /* Positions */
    :host([position="top-center"]) {
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
    }
    :host([position="bottom-center"]) {
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
    }
    :host([position="top-right"]) {
      top: 24px;
      right: 24px;
    }
    :host([position="bottom-right"]) {
      bottom: 24px;
      right: 24px;
    }

    .toast {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 12px;
      font: 15px/1.3 system-ui;
      color: var(--toast-text);
      background: var(--toast-bg);
      border: 1px solid var(--toast-border);
      box-shadow: var(--toast-shadow-info);
      backdrop-filter: blur(8px);
      max-width: 520px;
      text-align: left;
      pointer-events: auto;

      opacity: 0;
      transform: translateY(-10px);
      transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    :host([position="bottom-center"]) .toast {
      transform: translateY(10px);
    }

    .toast.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Type accents via glow */
    .toast.info { box-shadow: var(--toast-shadow-info); }
    .toast.success { box-shadow: var(--toast-shadow-info); }
    .toast.warning { box-shadow: var(--toast-shadow-warn); }
    .toast.error { box-shadow: var(--toast-shadow-warn); }

    /* Inline variant used for bottom-center over Live2D */
    :host([variant="inline"]) .toast {
      font: 17px/1.2 system-ui;
      padding: 8px 12px;
      border-radius: 10px;
      background: var(--toast-bg-strong);
      border: 1px solid var(--toast-border);
    }

    .toast-icon { display: inline-block; font-size: 18px; }
    .toast-message { display: inline-block; }
  `;

  render() {
    if (!this.message) return html``;
    return html`
      <div class="toast ${this.type} ${this.visible ? "visible" : ""}">
        <span class="toast-icon">${this._getIcon()}</span>
        <span class="toast-message">${this.message}</span>
      </div>
    `;
  }

  private _getIcon(): string {
    switch (this.type) {
      case "info": return "ℹ️";
      case "success": return "✅";
      case "warning": return "⚠️";
      case "error": return "❌";
      default: return "ℹ️";
    }
  }

  /**
   * Show the toast with optional overrides
   */
  show(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
    duration: number = 0,
    opts?: { position?: "top-center" | "bottom-center" | "top-right" | "bottom-right"; variant?: "standard" | "inline" }
  ) {
    this.message = message;
    this.type = type;
    if (opts?.position) this.position = opts.position;
    if (opts?.variant) this.variant = opts.variant;
    this.visible = true;
    this._isAnimating = true;

    if (duration > 0) {
      setTimeout(() => this.hide(), duration);
    }

    this.dispatchEvent(new CustomEvent("toast-show", {
      detail: { message, type },
      bubbles: true,
      composed: true,
    }));
  }

  hide() {
    this.visible = false;
    this._isAnimating = true;
    setTimeout(() => {
      this.message = "";
      this._isAnimating = false;
    }, 300);
    this.dispatchEvent(new CustomEvent("toast-hide", { bubbles: true, composed: true }));
  }

  get isVisible(): boolean { return this.visible; }
  get isAnimating(): boolean { return this._isAnimating; }
}
