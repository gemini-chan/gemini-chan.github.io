import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createComponentLogger } from "./src/debug-logger";
import { defaultAutoScroll } from "./transcript-auto-scroll";

const logger = createComponentLogger("call-transcript");

interface Turn {
  text: string;
  author: "user" | "model";
  timestamp?: Date;
}

@customElement("call-transcript")
export class CallTranscript extends LitElement {
  @property({ type: Array })
  transcript: Turn[] = [];

  @property({ type: Boolean })
  visible: boolean = false;

  @property({ type: Boolean })
  rateLimited: boolean = false;

  @property({ type: String })
  rateLimitMessage: string =
    "E-eh? I'm getting so... sleepy all of a sudden.... S-sorry.. Maybe let's call later?... *dozing off*..... (ρω-)";

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
      min-height: 400px;
      width: 400px;
      min-width: 300px;
      max-width: 500px;
      box-sizing: border-box;
      padding: 12px;
      gap: 12px;
      color: var(--cp-text);
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    :host([visible]) {
      opacity: 1;
      visibility: visible;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--cp-surface);
      border-radius: 10px;
      border: 1px solid var(--cp-surface-border);
      box-shadow: var(--cp-glow-cyan);
      color: var(--cp-text);
      font: 14px/1.4 system-ui;
      font-weight: 500;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .banner {
      display: none;
      align-items: center;
      gap: 8px;
      margin: 4px 0 0 0;
      padding: 6px 10px;
      border-radius: 8px;
      font: 13px/1.3 system-ui;
      color: var(--cp-text);
      background: linear-gradient(135deg, rgba(255, 179, 0, 0.15), rgba(255, 0, 0, 0.12));
      border: 1px solid rgba(255, 179, 0, 0.35);
      box-shadow: 0 0 0 1px rgba(255, 179, 0, 0.2), 0 0 12px rgba(255, 179, 0, 0.2);
    }

    :host([ratelimited]) .banner {
      display: flex;
    }

    .reset-button {
      outline: none;
      border: 1px solid var(--cp-surface-border);
      color: var(--cp-text);
      border-radius: 8px;
      background: var(--cp-surface);
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 16px;
      padding: 0;
      margin: 0;
      box-shadow: var(--cp-glow-cyan);
      backdrop-filter: blur(4px);
    }
    .reset-button:hover {
      background: var(--cp-surface-strong);
    }

    .call-indicator {
      width: 8px;
      height: 8px;
      background: var(--cp-green);
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(0, 255, 178, 0.8);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }

    .transcript {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
      -webkit-overflow-scrolling: touch;
    }

    .turn {
      padding: 8px 12px;
      border-radius: 10px;
      max-width: 80%;
      font: 16px/1.4 system-ui;
      white-space: pre-wrap;
      position: relative;
      border: 1px solid var(--cp-surface-border);
      background: var(--cp-surface);
    }

    .turn.user {
      background: linear-gradient(135deg, rgba(0, 229, 255, 0.18), rgba(124, 77, 255, 0.18));
      border-color: rgba(0, 229, 255, 0.35);
      box-shadow: var(--cp-glow-cyan);
      color: var(--cp-text);
      align-self: flex-end;
    }

    .turn.model {
      background: linear-gradient(135deg, rgba(255, 0, 229, 0.16), rgba(124, 77, 255, 0.16));
      border-color: rgba(255, 0, 229, 0.3);
      box-shadow: var(--cp-glow-magenta);
      color: var(--cp-text);
      align-self: flex-start;
    }

    .timestamp {
      font-size: 12px;
      opacity: 0.7;
      margin-top: 4px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--cp-muted);
      font: 16px/1.4 system-ui;
      text-align: center;
      gap: 8px;
    }

    .call-icon {
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }


  `;

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
    if (changedProperties.has("rateLimited")) {
      if (this.rateLimited) {
        this.setAttribute("ratelimited", "");
      } else {
        this.removeAttribute("ratelimited");
      }
    }

    if (changedProperties.has("transcript")) {
      // Use generic auto-scroll utility
      const transcriptEl = this.shadowRoot?.querySelector(".transcript");
      if (transcriptEl) {
        const oldTranscript =
          (changedProperties.get("transcript") as Turn[]) || [];
        logger.debug("Transcript updated", {
          oldLength: oldTranscript.length,
          newLength: this.transcript.length,
        });
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
      // Update the visible attribute for CSS styling
      if (this.visible) {
        this.setAttribute("visible", "");

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
        this.removeAttribute("visible");
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

      // Dispatch event to notify parent component of scroll state changes
      const detail = {
        showButton: state.showButton,
        newMessageCount: state.newMessageCount,
      };
      logger.debug("Scroll state changed", detail);
      this.dispatchEvent(
        new CustomEvent("scroll-state-changed", {
          detail,
          bubbles: true,
          composed: true,
        }),
      );
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

  private _formatTimestamp(timestamp?: Date): string {
    if (!timestamp) return "";
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  private _resetCall() {
    this.dispatchEvent(
      new CustomEvent("reset-call", { bubbles: true, composed: true }),
    );
  }

  render() {
    return html`
      <div class="header">
        <div class="header-content">
          <div class="call-indicator"></div>
          <span>Call in Progress</span>
        </div>
        <button class="reset-button" @click=${this._resetCall} title="Clear call history">
          <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
            <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/>
          </svg>
        </button>
      </div>
      <div class="banner" role="status" aria-live="polite">
        <svg class="message-icon" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
          <path d="M120-160v-640h720v640H120Zm80-80h560v-480H200v480Zm200-80h160v-80H400v80Zm-80-160h320v-80H320v80Z"/>
        </svg>
        <span>${this.rateLimitMessage}</span>
      </div>
      
      <div class="transcript">
        ${
          this.transcript.length === 0
            ? html`
          <div class="empty-state">
            <svg class="call-icon" xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="currentColor">
              <path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12Z"/>
            </svg>
            <div>Call transcript will appear here</div>
          </div>
        `
            : this.transcript.map(
                (turn) => html`
          <div class="turn ${turn.author}">
            ${turn.text}
            ${
              turn.timestamp
                ? html`
              <div class="timestamp">${this._formatTimestamp(turn.timestamp)}</div>
            `
                : ""
            }
          </div>
        `,
              )
        }
      </div>
    `;
  }
}
