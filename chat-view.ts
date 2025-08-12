import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { defaultAutoScroll } from "./transcript-auto-scroll";

interface Turn {
  text: string;
  author: "user" | "model";
}

@customElement("chat-view")
export class ChatView extends LitElement {
  @property({ type: Array })
  transcript: Turn[] = [];

  @property({ type: Boolean })
  visible: boolean = true;

  @state()
  private inputValue = "";

  @state()
  private showScrollToBottom = false;

  @state()
  private newMessageCount = 0;

  private lastSeenMessageCount = 0;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      max-height: 100vh;
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      gap: 12px;
      opacity: 1;
      visibility: visible;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    :host([hidden]) {
      opacity: 0;
      visibility: hidden;
    }

    .transcript {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }

    .turn {
      padding: 8px 12px;
      border-radius: 10px;
      max-width: 80%;
      font: 16px/1.4 system-ui;
      white-space: pre-wrap;
    }

    .turn.user {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      align-self: flex-end;
    }

    .turn.model {
      background: rgba(0, 0, 0, 0.3);
      color: #fff;
      align-self: flex-start;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      color: #fff;
      font: 14px/1.4 system-ui;
      font-weight: 500;
      margin-bottom: 12px;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .message-icon {
      width: 16px;
      height: 16px;
    }

    .reset-button {
      outline: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 16px;
      padding: 0;
      margin: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      backdrop-filter: blur(4px);

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }

    .input-area {
      display: flex;
      gap: 12px;
    }

    textarea {
      flex: 1;
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(0, 0, 0, 0.2);
      color: white;
      font: 16px/1.4 system-ui;
      resize: none;
      outline: none;
      height: 56px;
      box-sizing: border-box;
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

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }

    .scroll-to-bottom {
      position: absolute;
      bottom: 80px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(100, 150, 255, 0.9);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(8px);
      transition: all 0.3s ease;
      z-index: 10;
      opacity: 0;
      transform: translateY(10px);
      pointer-events: none;
    }

    .scroll-to-bottom.visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .scroll-to-bottom:hover {
      background: rgba(100, 150, 255, 1);
      transform: scale(1.1);
    }

    .scroll-to-bottom .badge {
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

    .transcript-container {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  `;

  private _handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.inputValue = target.value;
  }

  private _sendMessage() {
    if (!this.inputValue.trim()) return;
    this.dispatchEvent(
      new CustomEvent("send-message", { detail: this.inputValue }),
    );
    this.inputValue = "";
  }

  private _resetText() {
    this.dispatchEvent(
      new CustomEvent("reset-text", { bubbles: true, composed: true }),
    );
  }

  firstUpdated() {
    // Add scroll event listener to update scroll-to-bottom button visibility
    const transcriptEl = this.shadowRoot?.querySelector(".transcript");
    if (transcriptEl) {
      transcriptEl.addEventListener("scroll", () => {
        const isAtBottom = defaultAutoScroll.handleScrollEvent(transcriptEl);
        if (isAtBottom) {
          this.lastSeenMessageCount = this.transcript.length;
        }
        this._updateScrollToBottomState();
      });
    }
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has("transcript")) {
      // Use generic auto-scroll utility
      const transcriptEl = this.shadowRoot?.querySelector(".transcript");
      if (transcriptEl) {
        const oldTranscript =
          (changedProperties.get("transcript") as Turn[]) || [];
        defaultAutoScroll.handleTranscriptUpdate(
          transcriptEl,
          oldTranscript.length,
          this.transcript.length,
        );

        // Update scroll-to-bottom button state
        this._updateScrollToBottomState();
      }
    }

    if (changedProperties.has("visible")) {
      if (this.visible) {
        this.removeAttribute("hidden");

        // Use generic auto-scroll utility for visibility changes
        const transcriptEl = this.shadowRoot?.querySelector(".transcript");
        if (transcriptEl) {
          defaultAutoScroll.handleVisibilityChange(
            transcriptEl,
            this.visible,
            this.transcript.length > 0,
          );
        }
      } else {
        this.setAttribute("hidden", "");
      }
    }
  }

  private _updateScrollToBottomState() {
    const transcriptEl = this.shadowRoot?.querySelector(".transcript");
    if (transcriptEl) {
      const state = defaultAutoScroll.getScrollToBottomState(
        transcriptEl,
        this.transcript.length,
        this.lastSeenMessageCount,
      );
      this.showScrollToBottom = state.showButton;
      this.newMessageCount = state.newMessageCount;
    }
  }

  private _scrollToBottom() {
    const transcriptEl = this.shadowRoot?.querySelector(".transcript");
    if (transcriptEl) {
      defaultAutoScroll.scrollToBottom(transcriptEl, true);
      this.lastSeenMessageCount = this.transcript.length;
      this._updateScrollToBottomState();
    }
  }

  render() {
    return html`
      <div class="header">
        <div class="header-title">
          <svg class="message-icon" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
            <path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Z"/>
          </svg>
          <span>Messages</span>
        </div>
        <button class="reset-button" @click=${this._resetText} title="Clear conversation">
          <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
            <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/>
          </svg>
        </button>
      </div>
      <div class="transcript-container">
        <div class="transcript">
          ${this.transcript.map(
            (turn) => html`
            <div class="turn ${turn.author}">${turn.text}</div>
          `,
          )}
        </div>
        
        <button 
          class="scroll-to-bottom ${this.showScrollToBottom ? "visible" : ""}"
          @click=${this._scrollToBottom}
          title="Scroll to bottom">
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
            <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
          </svg>
          ${
            this.newMessageCount > 0
              ? html`
            <div class="badge">${this.newMessageCount}</div>
          `
              : ""
          }
        </button>
      </div>
      <div class="input-area">
        <textarea .value=${this.inputValue} @input=${this._handleInput} @keydown=${(
          e: KeyboardEvent,
        ) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            this._sendMessage();
          }
        }} placeholder="Type a message..."></textarea>
        <button @click=${this._sendMessage}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M120-160v-240l320-80-320-80v-240l760 320-760 320Z"/></svg>
        </button>
      </div>
    `;
  }
}
