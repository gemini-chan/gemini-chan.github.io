import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

interface Turn {
  text: string;
  author: 'user' | 'model';
}

@customElement("chat-view")
export class ChatView extends LitElement {
  @property({ type: Array })
  transcript: Turn[] = [];

  @state()
  private inputValue = "";

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      gap: 12px;
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
  `;

  private _handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.inputValue = target.value;
  }

  private _sendMessage() {
    if (!this.inputValue.trim()) return;
    this.dispatchEvent(new CustomEvent('send-message', { detail: this.inputValue }));
    this.inputValue = "";
  }

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('transcript')) {
      const transcriptEl = this.shadowRoot?.querySelector('.transcript');
      if (transcriptEl) {
        transcriptEl.scrollTop = transcriptEl.scrollHeight;
      }
    }
  }

  render() {
    return html`
      <div class="transcript">
        ${this.transcript.map(turn => html`
          <div class="turn ${turn.author}">${turn.text}</div>
        `)}
      </div>
      <div class="input-area">
        <textarea .value=${this.inputValue} @input=${this._handleInput} @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey) {
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