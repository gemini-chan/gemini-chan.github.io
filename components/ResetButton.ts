import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('reset-button')
export class ResetButton extends LitElement {
  @property({ type: String }) label = 'Reset';
  @property({ type: String }) title = 'Reset to defaults';

  static styles = css`
    :host { display: inline-flex; }
    button {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      border: 1px solid var(--cp-surface-border, #444);
      background: var(--cp-surface, #111);
      color: var(--cp-muted, #ddd);
      border-radius: 6px;
      padding: 0.2rem 0.5rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    button:hover { 
      background: var(--cp-surface-strong, #151515);
      color: var(--cp-text);
    }
    svg { width: 14px; height: 14px; }
  `;

  private _onClick = () => {
    this.dispatchEvent(new CustomEvent('reset', { bubbles: true, composed: true }));
  };

  render() {
    return html`
      <button @click=${this._onClick} title=${this.title} aria-label=${this.title}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12,6V3L8,7l4,4V8c2.76,0,5,2.24,5,5c0,2.76-2.24,5-5,5s-5-2.24-5-5H5c0,3.87,3.13,7,7,7s7-3.13,7-7S15.87,6,12,6z"/>
        </svg>
      </button>
    `;
  }
}
