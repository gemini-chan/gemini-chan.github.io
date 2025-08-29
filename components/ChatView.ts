import { defaultAutoScroll } from "@components/TranscriptAutoScroll";
import { createComponentLogger } from "@services/DebugLogger";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { throttle } from "@shared/utils";
import type { Turn } from "@shared/types";

const log = createComponentLogger("ChatView");

@customElement("chat-view")
export class ChatView extends LitElement {
  @property({ type: Array })
  transcript: Turn[] = [];

  @property({ type: Boolean })
  visible = true;

  @state()
  private inputValue = "";

  @state()
  private newMessageCount = 0;

  @state()
  private isChatActive = false;

  @property({ type: String })
  thinkingStatus: string = "";

  @property({ type: String })
  thinkingSubStatus: string = "";

  @property({ type: String })
  thinkingText: string = "";

  @property({ type: Boolean })
  thinkingActive: boolean = false;
  
  @property({ type: Number })
  npuProcessingTime: number | null = null;
  
  @property({ type: Number })
  vpuProcessingTime: number | null = null;
  
  @property({ type: Object })
  messageStatuses: Record<string, string> = {};
  
  @property({ type: Object })
  messageRetryCount: Record<string, number> = {};
  
  @property({ type: String })
  phase: 'idle'|'npu'|'vpu'|'complete'|'error' = 'idle';
  
  @property({ type: Number })
  hardDeadlineMs: number = 0;
  
  @property({ type: Number })
  idleDeadlineMs?: number;
  
  @property({ type: String })
  turnId: string = '';
  
  // Helper getter to determine if thinking UI should be shown
  private get _showThinking(): boolean {
    return this.thinkingActive || !!this.thinkingStatus || !!this.thinkingText;
  }
  
  private _devRemainingMs = 0;
  
  
  // Debounce timer for scroll events
  private scrollDebounceTimer: number | null = null;

  private lastSeenMessageCount = 0;
  private textareaRef: HTMLTextAreaElement | null = null;
  
  // Previous scroll state tracking
  private _prevShowButton: boolean | null = null;
  private _prevNewMessageCount: number = 0;
  
  // Throttled loggers
  private _logScrollState = throttle((detail: { showButton: boolean; newMessageCount: number }) => 
    log.debug("Scroll state changed", detail), 250, { trailing: false });
    
  private _logScrollButton = throttle((detail: { showButton: boolean; newMessageCount: number }) => 
    log.debug("Scroll to bottom state updated", detail), 250, { trailing: false });

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      width: 100%;
      min-width: 300px;
      box-sizing: border-box;
      padding: 12px;
      gap: 12px;
      color: var(--cp-text);
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
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: var(--cp-surface-strong) var(--cp-surface);
      -webkit-overflow-scrolling: touch;
    }

    /* Custom scrollbar styles for Webkit browsers */
    .transcript::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    .transcript::-webkit-scrollbar-track {
      background-color: var(--cp-surface);
      border-radius: 4px;
    }

    .transcript::-webkit-scrollbar-thumb {
      background-color: var(--cp-surface-strong);
      border-radius: 4px;
      border: 1px solid transparent;
      background-clip: content-box;
    }

    .transcript::-webkit-scrollbar-thumb:hover {
      background-color: var(--cp-cyan);
      box-shadow: var(--cp-glow-cyan);
    }

    .turn {
      padding: 8px 12px;
      border-radius: 10px;
      max-width: 80%;
      font: 16px/1.4 system-ui;
      white-space: pre-wrap;
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

    .turn.system {
      align-self: center;
      background: var(--cp-surface-strong);
      border-color: var(--cp-surface-border-2);
      color: var(--cp-muted);
      font-size: 14px;
      font-style: italic;
      max-width: 90%;
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

    .input-area {
      display: flex;
      gap: 12px;
    }

    textarea {
      flex: 1;
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid var(--cp-surface-border);
      background: var(--cp-surface);
      color: var(--cp-text);
      font: 16px/1.4 system-ui;
      resize: none;
      outline: none;
      min-height: 56px;
      max-height: 200px;
      height: auto;
      overflow-y: auto;
      box-sizing: border-box;
      box-shadow: var(--cp-glow-purple);
      transition: height 0.1s ease;
      scrollbar-width: thin;
      scrollbar-color: var(--cp-surface-strong) transparent;
    }
    
    textarea:disabled {
      opacity: 0.7;
      cursor: not-allowed;
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

    button {
      outline: none;
      border: 1px solid var(--cp-surface-border);
      color: var(--cp-text);
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(0,229,255,0.15), rgba(124,77,255,0.15));
      width: 56px;
      height: 56px;
      cursor: pointer;
      font-size: 24px;
      padding: 0;
      margin: 0;
      box-shadow: var(--cp-glow-cyan);
      backdrop-filter: blur(4px);
      transition: transform 0.15s ease, background 0.15s ease;
    }

    button:hover {
      background: linear-gradient(135deg, rgba(0,229,255,0.22), rgba(124,77,255,0.22));
      transform: translateY(-1px);
    }
    

    .scroll-to-bottom {
      position: absolute;
      bottom: 80px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(0,229,255,0.9), rgba(124,77,255,0.9));
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
      transform: scale(1.08);
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

    .thinking {
      background: var(--cp-surface);
      border: 1px solid var(--cp-surface-border);
      border-radius: 10px;
      box-shadow: var(--cp-glow-purple);
      padding: 8px 10px;
      font: 13px/1.35 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      color: var(--cp-muted);
    }
    .thinking-badge { 
      font-size: 12px; 
      padding: 2px 6px; 
      border-radius: 999px; 
      background: var(--cp-surface-strong); 
      border: 1px solid var(--cp-surface-border-2);
    }
    .thinking-badge.active {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .status-line {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .thinking-spinner {
      width: 12px;
      height: 12px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .thinking.hidden {
      display: none;
    }

    .transcript-container {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
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

    .chat-icon {
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }
    
    .msg-status {
      margin-left: 6px;
      opacity: 0.7;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      vertical-align: middle;
    }
    
    .msg-status.clock {
      color: var(--cp-cyan, #00e5ff);
    }
    
    .msg-status.single {
      color: var(--cp-purple, #7c4dff);
    }
    
    .msg-status.double {
      color: var(--cp-green, #00c853);
    }
    
    .msg-status.double svg:first-child {
      margin-right: 2px;
    }
    
    .msg-status.error {
      color: var(--cp-red, #ff1744);
    }
    
    .retry-badge {
      font-size: 10px;
      opacity: 0.8;
      margin-left: 2px;
      vertical-align: super;
      background: var(--cp-surface-strong);
      padding: 1px 3px;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    
    .msg-status svg {
      transition: transform 120ms ease, opacity 120ms ease;
    }
    
    @keyframes tick-pop {
      0% { transform: scale(0.8); opacity: 0.4; }
      100% { transform: scale(1); opacity: 1; }
    }
    
    @keyframes tick-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.12); }
    }
    
    .msg-status.single svg {
      animation: tick-pop 160ms ease;
    }
    
    .msg-status.double svg {
      animation: tick-pulse 800ms ease-in-out 2;
    }
    
    .dev-meta {
      font-size: 11px;
      opacity: 0.6;
      padding-left: 16px; /* to align with text after spinner */
    }

    .status-primary {
      /* Main status text is default weight */
    }
    .status-secondary {
      margin-left: 6px;
      opacity: 0.7;
    }
  `;

  private _renderMessageStatus(id: string) {
    const status = this.messageStatuses[id];
    const retryCount = this.messageRetryCount[id];
    
    let title = '';
    let ariaLabel = '';
    
    switch (status) {
      case 'clock':
        title = 'Analyzing…';
        ariaLabel = 'Message status: Analyzing';
        break;
      case 'single':
        title = 'Sent to NPU';
        ariaLabel = 'Message status: Sent to NPU';
        break;
      case 'double':
        title = 'Advisor responded';
        ariaLabel = 'Message status: Advisor responded';
        break;
      default:
        title = 'Error';
        ariaLabel = 'Message status: Error';
    }
    
    return html`<span 
      class="msg-status ${status}" 
      title="${title}"
      aria-label="${ariaLabel}"
      @click=${(e: Event) => e.stopPropagation()}>
        ${status === 'clock' 
          ? html`<svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Zm-40-280h80v-200h-80v200Z"/></svg>`
          : status === 'single'
          ? html`<svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>`
          : status === 'double'
          ? html`<svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg><svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>`
          : html`<svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-200h-80v200Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>`}
        ${retryCount && retryCount > 0 
          ? html`<span class="retry-badge" title="Retrying… (x${retryCount})" aria-label="Retry count: ${retryCount}">×</span>`
          : ''}
    </span>`;
  }

  private _handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.inputValue = target.value;

    // Auto-resize textarea
    this._resizeTextarea(target);

    log.trace("Input value changed");
  }

  private _handleFocus() {
    this.isChatActive = true;
    this._dispatchChatActiveChanged();
  }

  private _handleBlur() {
    this.isChatActive = false;
    this._dispatchChatActiveChanged();
  }

  private _dispatchChatActiveChanged() {
    const detail = { isChatActive: this.isChatActive };
    log.debug("Chat active changed", detail);
    this.dispatchEvent(
      new CustomEvent("chat-active-changed", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

   
  private _resizeTextarea(textarea: HTMLTextAreaElement) {
    // Reset height to recalculate
    textarea.style.height = "auto";

    // Calculate new height based on scroll height
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 56;
    const maxHeight = 200;

    // Clamp the height between min and max
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }

  private _sendMessage() {
    if (!this.inputValue.trim()) return;

    log.debug("Sending message", { message: this.inputValue });
    this.dispatchEvent(
      new CustomEvent("send-message", { detail: this.inputValue }),
    );
    this.inputValue = "";

    // Reset textarea height after sending
    if (this.textareaRef) {
      this.textareaRef.style.height = "56px";
    }
  }

  private _resetText() {
    log.debug("Resetting conversation");
    this.dispatchEvent(
      new CustomEvent("reset-text", { bubbles: true, composed: true }),
    );
  }

  connectedCallback() {
    super.connectedCallback();
    log.debug("Component mounted", { 
      isConnected: this.isConnected,
      visibilityState: document.visibilityState 
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    log.debug("Component unmounted");
  }

  firstUpdated() {
    log.debug("Component first updated");
    // Add scroll event listener to update scroll-to-bottom button visibility
    const transcriptEl = this.shadowRoot?.querySelector(".transcript");
    if (transcriptEl) {
      transcriptEl.addEventListener("scroll", () => {
        // Debounce scroll events to reduce UI churn
        if (this.scrollDebounceTimer) {
          clearTimeout(this.scrollDebounceTimer);
        }
        
        this.scrollDebounceTimer = window.setTimeout(() => {
          const isAtBottom = defaultAutoScroll.handleScrollEvent(transcriptEl);
          if (isAtBottom) {
            this.lastSeenMessageCount = this.transcript.length;
          }
          this._updateScrollToBottomState();
          this.scrollDebounceTimer = null;
        }, 100); // Debounce for 100ms
      });
    }

    // Store reference to textarea for height management
    this.textareaRef = this.shadowRoot?.querySelector(
      "textarea",
    ) as HTMLTextAreaElement;
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    log.debug("ChatView UPDATED", {
      thinkingStatus: this.thinkingStatus,
      thinkingActive: this.thinkingActive,
      textLen: (this.thinkingText || '').length,
      transcriptLen: this.transcript.length,
      isConnected: this.isConnected,
      visibilityState: document.visibilityState
    });
    
    if (changedProperties.has("transcript")) {
      // Use generic auto-scroll utility
      const transcriptEl = this.shadowRoot?.querySelector(".transcript");
      if (transcriptEl) {
        const oldTranscript =
          (changedProperties.get("transcript") as Turn[]) || [];
        log.debug("Transcript updated", {
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
      log.debug(`Visibility changed to ${this.visible}`);
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
private async _updateScrollToBottomState() {
  // Await a microtask to allow the DOM to update before we measure it
  await new Promise(resolve => setTimeout(resolve, 0));

  const transcriptEl = this.shadowRoot?.querySelector(".transcript");
  if (transcriptEl) {
    const state = defaultAutoScroll.getScrollToBottomState(
      transcriptEl,
      this.transcript.length,
      this.lastSeenMessageCount,
    );
    this.newMessageCount = state.newMessageCount;

    // Only log when state actually changes
    if (this._prevShowButton !== state.showButton || this._prevNewMessageCount !== state.newMessageCount) {
      this._logScrollButton({
        showButton: state.showButton,
        newMessageCount: state.newMessageCount,
      });
        
      this._prevShowButton = state.showButton;
      this._prevNewMessageCount = state.newMessageCount;
    }

    // Dispatch event to notify parent component of scroll state changes
    const detail = {
      showButton: state.showButton,
      newMessageCount: state.newMessageCount,
    };
      
    // Only log scroll state when it changes
    if (this._prevShowButton !== detail.showButton || this._prevNewMessageCount !== detail.newMessageCount) {
      this._logScrollState(detail);
    }
      
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
    log.debug("Scrolling to bottom");
    const transcriptEl = this.shadowRoot?.querySelector(".transcript");
    if (transcriptEl) {
      defaultAutoScroll.scrollToBottom(transcriptEl, true);
      this.lastSeenMessageCount = this.transcript.length;
    }
  }

  render() {
    return html`
      <div class="header">
        <div class="header-title">
          <svg class="message-icon" xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
            <path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Z"/>
          </svg>
          <span>Chat</span>
        </div>
        <div class="header-actions">
          <button class="reset-button" @click=${this._resetText} title="Clear conversation">
            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Z"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="thinking ${!this._showThinking ? 'hidden' : ''}">
        <span class="thinking-badge ${this.thinkingActive ? 'active' : ''}" aria-live="polite">
          <div class="status-line">
            ${(this.phase === 'npu' || this.phase === 'vpu') ? html`<div class="thinking-spinner"></div>` : ''}
            <span class="status-primary">${this.thinkingStatus}</span>
            ${this.thinkingSubStatus ? html`<span class="status-secondary">${this.thinkingSubStatus}</span>` : ''}
          </div>
        </span>
      </div>
      <div class="transcript-container">
        <div class="transcript">
          ${
            this.transcript.length === 0
              ? html`
                  <div class="empty-state">
                    <svg
                      class="chat-icon"
                      xmlns="http://www.w3.org/2000/svg"
                      height="48px"
                      viewBox="0 -960 960 960"
                      width="48px"
                      fill="currentColor"
                    >
                      <path
                        d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Z"
                      />
                    </svg>
                    <div>No messages yet</div>
                  </div>
                `
              : this.transcript.map(
                  (turn) => {
                    const who = turn.speaker;
                    const id = turn.turnId;
                    return html`
                      <div
                        class="turn ${who} ${turn.isSystemMessage
                          ? "system"
                          : ""}"
                      >
                        ${turn.text}
                        ${who === "user" && id && this.messageStatuses[id] 
                          ? this._renderMessageStatus(id)
                          : ''}
                      </div>
                    `;
                  }
                )
          }
        </div>
      </div>
      <div class="input-area">
        <textarea
          .value=${this.inputValue}
          @input=${this._handleInput}
          @focus=${this._handleFocus}
          @blur=${this._handleBlur}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              this._sendMessage();
            }
          }} 
          placeholder="Type a message..."
          rows="1"
        ></textarea>
        <button @click=${this._sendMessage}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ffffff"><path d="M120-160v-240l320-80-320-80v-240l760 320-760 320Z"/></svg>
        </button>
      </div>
    `;
  }

}
