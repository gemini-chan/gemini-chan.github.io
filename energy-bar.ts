import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  type EnergyLevelChangedDetail,
  energyBarService,
} from "./src/energy-bar-service";

@customElement("energy-bar")
export class EnergyBar extends LitElement {
  @property({ type: Number, reflect: true }) level: 0 | 1 | 2 | 3 =
    energyBarService.getCurrentEnergyLevel();

  @state() private _animating = false;

  static styles = css`
    :host { display: inline-flex; align-items: center; gap: 8px; }
    .battery { position: relative; width: 36px; height: 18px; border: 2px solid currentColor; border-radius: 4px; box-sizing: border-box; }
    .battery::after { content: ""; position: absolute; right: -4px; top: 4px; width: 3px; height: 8px; background: currentColor; border-radius: 1px; }
    .bars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 2px; height: 100%; }
    .bar { border-radius: 2px; background: transparent; opacity: 0.35; transition: opacity 200ms ease, background-color 200ms ease, transform 200ms ease; }
    .bar.filled { opacity: 1; }
    :host([level="3"]) { color: #00c853; }
    :host([level="2"]) { color: #fdd835; }
    :host([level="1"]) { color: #fb8c00; }
    :host([level="0"]) { color: #e53935; }
    .drain { transform: scaleY(0); opacity: 0.3; }
    .fill { transform: scaleY(1.1); }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    energyBarService.addEventListener(
      "energy-level-changed",
      this._onEnergyChanged as EventListener,
    );
  }

  disconnectedCallback(): void {
    energyBarService.removeEventListener(
      "energy-level-changed",
      this._onEnergyChanged as EventListener,
    );
    super.disconnectedCallback();
  }

  private _onEnergyChanged = (e: CustomEvent<EnergyLevelChangedDetail>) => {
    const old = this.level;
    const next = e.detail.level;
    if (old === next) return;
    this._animating = true;
    this.level = next;
    // end animation after short delay
    setTimeout(() => {
      this._animating = false;
    }, 250);
  };

  render() {
    const filledCount = this.level;
    const bars = [0, 1, 2].map((i) => i < filledCount);
    return html`
      <div class="battery" aria-label="Energy level ${this.level} of 3" title="Energy: ${this.level}/3">
        <div class="bars">
          ${bars.map((filled, _idx) => html`<div class="bar ${filled ? "filled" : ""} ${this._animating ? (filled ? "fill" : "drain") : ""}"></div>`)}
        </div>
      </div>
    `;
  }
}
