import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { CallSummary } from "./types"; // Assuming types are defined in types.ts

@customElement("call-history-view")
export class CallHistoryView extends LitElement {
  @property({ type: Array }) callHistory: CallSummary[] = [];

  static styles = css`
    .history-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .history-item {
      padding: 10px 12px;
      border-bottom: 1px solid var(--cp-surface-border);
      cursor: pointer;
      color: var(--cp-text);
      background: var(--cp-surface);
      transition: background 0.15s ease;
    }
    .history-item:hover {
      background: var(--cp-surface-strong);
    }
  `;

  _startTts(summary: CallSummary) {
    this.dispatchEvent(
      new CustomEvent("start-tts-from-summary", {
        detail: { summary },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <ul class="history-list">
        ${this.callHistory.map(
          (call) => html`
            <li class="history-item" @click=${() => this._startTts(call)}>
              <div>${new Date(call.timestamp).toLocaleString()}</div>
              <div>${call.summary}</div>
            </li>
          `,
        )}
      </ul>
    `;
  }
}
