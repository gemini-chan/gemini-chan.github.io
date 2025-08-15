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

  @state()
  private _isAnimating = false;

  static styles = css`
    :host {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      pointer-events: none;
    }

    .toast {
      display: inline-block;
      padding: 8px 12px;
      border-radius: 10px;
      font: 17px/1.2 system-ui;
      box-shadow: var(--cp-glow-cyan);
      backdrop-filter: blur(8px);
      opacity: 0;
      transform: translateY(-20px);
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 400px;
      text-align: center;
      pointer-events: auto;
      border: 1px solid var(--cp-surface-border);
      color: var(--cp-text);
    }

    .toast.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .toast.info {
      background: linear-gradient(135deg, rgba(0,229,255,0.85), rgba(124,77,255,0.85));
      color: #000;
      font-weight: 600;
    }

    .toast.warning {
      background: linear-gradient(135deg, rgba(255, 179, 0, 0.9), rgba(255, 0, 0, 0.85));
      color: #000;
      font-weight: 600;
    }

    .toast.success {
      background: linear-gradient(135deg, rgba(0, 255, 178, 0.9), rgba(124,77,255,0.85));
      color: #000;
      font-weight: 600;
    }

    .toast.error {
      background: linear-gradient(135deg, rgba(255, 59, 110, 0.95), rgba(124,77,255,0.85));
      color: #000;
      font-weight: 600;
    }

    .toast-icon {
      display: inline-block;
      margin-right: 8px;
      font-size: 18px;
      vertical-align: middle;
    }

    .toast-message {
      display: inline-block;
      vertical-align: middle;
    }
  `;

  render() {
    if (!this.message) {
      return html``;
    }

    return html`
      <div class="toast ${this.type} ${this.visible ? "visible" : ""}">
        <span class="toast-icon">${this._getIcon()}</span>
        <span class="toast-message">${this.message}</span>
      </div>
    `;
  }

  private _getIcon(): string {
    switch (this.type) {
      case "info":
        return "ℹ️";
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      default:
        return "ℹ️";
    }
  }

  /**
   * Show the toast with a message
   * @param message - The message to display
   * @param type - The type of toast (info, success, warning, error)
   * @param duration - How long to show the toast in milliseconds (0 = manual hide)
   */
  show(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
    duration: number = 0,
  ) {
    this.message = message;
    this.type = type;
    this.visible = true;
    this._isAnimating = true;

    // Auto-hide after duration if specified
    if (duration > 0) {
      setTimeout(() => {
        this.hide();
      }, duration);
    }

    // Dispatch show event
    this.dispatchEvent(
      new CustomEvent("toast-show", {
        detail: { message, type },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Hide the toast
   */
  hide() {
    this.visible = false;
    this._isAnimating = true;

    // Clear message after animation completes
    setTimeout(() => {
      this.message = "";
      this._isAnimating = false;
    }, 300);

    // Dispatch hide event
    this.dispatchEvent(
      new CustomEvent("toast-hide", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Check if the toast is currently visible
   */
  get isVisible(): boolean {
    return this.visible;
  }

  /**
   * Check if the toast is currently animating
   */
  get isAnimating(): boolean {
    return this._isAnimating;
  }
}
