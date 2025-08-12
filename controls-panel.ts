import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("controls-panel")
export class ControlsPanel extends LitElement {
  @property({ type: Boolean })
  isCallActive = false;

  @property({ type: Boolean })
  showScrollToBottom = false;

  @property({ type: Number })
  newMessageCount = 0;

  static styles = css`
    :host {
      z-index: 10;
      position: absolute;
      right: 24px;
      bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
    }

    button {
      outline: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      width: 56px;
      height: 56px;
      cursor: pointer;
      font-size: 24px;
      padding: 0;
      margin: 0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      backdrop-filter: blur(4px);
      transition: all 0.2s ease;
    }

    button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    button[disabled] {
      display: none;
    }

    .scroll-button {
      position: relative;
      opacity: 0.3;
      transition: opacity 0.2s ease;
    }

    .scroll-button.visible {
      opacity: 1;
    }

    .message-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: rgba(255, 100, 100, 0.9);
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      border: 2px solid rgba(255, 255, 255, 0.8);
    }
  `;

  private _toggleSettings() {
    this.dispatchEvent(
      new CustomEvent("toggle-settings", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _scrollToBottom() {
    this.dispatchEvent(
      new CustomEvent("scroll-to-bottom", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleCallStart() {
    this.dispatchEvent(
      new CustomEvent("call-start", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleCallEnd() {
    this.dispatchEvent(
      new CustomEvent("call-end", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <button
        id="settingsButton"
        @click=${this._toggleSettings}
        ?disabled=${this.isCallActive}
        title="Settings">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="40px"
          viewBox="0 -960 960 960"
          width="40px"
          fill="#ffffff">
          <path d="M480-320q-75 0-127.5-52.5T300-500q0-75 52.5-127.5T480-680q75 0 127.5 52.5T660-500q0 75-52.5 127.5T480-320Zm0-80q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29ZM160-120q-33 0-56.5-23.5T80-200v-560q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v560q0 33-23.5 56.5T800-120H160Zm0-80h640v-560H160v560Z"/>
        </svg>
      </button>

      <button
        id="scrollToBottomButton"
        class="scroll-button ${this.showScrollToBottom ? "visible" : ""}"
        @click=${this._scrollToBottom}
        ?disabled=${!this.isCallActive || !this.showScrollToBottom}
        title="Scroll to bottom">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="#00c800">
          <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
        </svg>
        ${
          this.newMessageCount > 0
            ? html`
          <div class="message-badge">
            ${this.newMessageCount}
          </div>
        `
            : ""
        }
      </button>

      <button
        id="callButton"
        @click=${this._handleCallStart}
        ?disabled=${this.isCallActive}
        title="Start call">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="32px"
          viewBox="0 -960 960 960"
          width="32px"
          fill="#00c800">
          <path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/>
        </svg>
      </button>

      <button
        id="endCallButton"
        @click=${this._handleCallEnd}
        ?disabled=${!this.isCallActive}
        title="End call">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="32px"
          viewBox="0 -960 960 960"
          width="32px"
          fill="#c80000">
          <path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/>
        </svg>
      </button>
    `;
  }
}
