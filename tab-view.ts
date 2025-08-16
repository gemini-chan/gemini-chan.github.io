import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./tts-energy-bar";

@customElement("tab-view")
export class TabView extends LitElement {
  @property({ type: String }) activeTab: "chat" | "call-history" = "chat";
  @property({ type: Boolean, reflect: true }) visible: boolean = true;

  static styles = css`
    :host {
      display: none;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    :host([visible]) {
      display: block;
    }

    .tabs {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--cp-surface-border);
      background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent);
      position: sticky;
      top: 0;
      z-index: 5;
    }
    
    .tab-buttons {
      display: flex;
      gap: 8px;
    }
    
    .tab-indicators {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tab {
      padding: 10px 16px;
      cursor: pointer;
      border: 1px solid var(--cp-surface-border);
      border-bottom: none;
      color: var(--cp-text);
      background: var(--cp-surface);
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      box-shadow: var(--cp-glow-purple);
      transition: background 0.15s ease, transform 0.15s ease;
    }
    .tab:hover {
      background: var(--cp-surface-strong);
      transform: translateY(-1px);
    }
    .tab.active {
      background: linear-gradient(135deg, rgba(0,229,255,0.18), rgba(124,77,255,0.18));
      box-shadow: var(--cp-glow-cyan);
      border-color: var(--cp-surface-border);
      color: var(--cp-text);
    }
  `;

  _switchTab(tab: "chat" | "call-history") {
    this.dispatchEvent(
      new CustomEvent("tab-switch", {
        detail: { tab },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <div class="tabs">
        <div class="tab-buttons">
          <div
            class="tab ${this.activeTab === "chat" ? "active" : ""}"
            @click=${() => this._switchTab("chat")}
          >
            Chat
          </div>
          <div
            class="tab ${this.activeTab === "call-history" ? "active" : ""}"
            @click=${() => this._switchTab("call-history")}
          >
            Call History
          </div>
        </div>
        <div class="tab-indicators">
          <tts-energy-bar></tts-energy-bar>
        </div>
      </div>
    `;
  }
}
