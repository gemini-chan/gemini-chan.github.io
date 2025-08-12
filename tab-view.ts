import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('tab-view')
export class TabView extends LitElement {
  @property({ type: String }) activeTab: 'chat' | 'call-history' = 'chat';

  static styles = css`
    .tabs {
      display: flex;
      border-bottom: 1px solid #ccc;
    }
    .tab {
      padding: 10px 20px;
      cursor: pointer;
      border: 1px solid transparent;
      border-bottom: none;
    }
    .tab.active {
      border-color: #ccc;
      border-bottom: 1px solid white;
      background-color: white;
    }
  `;

  _switchTab(tab: 'chat' | 'call-history') {
    this.dispatchEvent(
      new CustomEvent('tab-switch', { detail: { tab }, bubbles: true, composed: true })
    );
  }

  render() {
    return html`
      <div class="tabs">
        <div
          class="tab ${this.activeTab === 'chat' ? 'active' : ''}"
          @click=${() => this._switchTab('chat')}
        >
          Chat
        </div>
        <div
          class="tab ${this.activeTab === 'call-history' ? 'active' : ''}"
          @click=${() => this._switchTab('call-history')}
        >
          Call History
        </div>
      </div>
    `;
  }
}