import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  type EnergyLevelChangedDetail,
  energyBarService,
} from "@services/EnergyBarService";

@customElement("energy-bar")
export class EnergyBar extends LitElement {
  @property({ type: Number, reflect: true }) level: 0 | 1 | 2 | 3 =
    energyBarService.getCurrentEnergyLevel("sts");

  @state() private _animating = false;
  @state() private _changedIndex: number = -1;
  @state() private _changeKind: "fill" | "drain" | null = null;

  static styles = css`
    :host { display: inline-flex; align-items: center; gap: 8px; }
    .battery { position: relative; width: 36px; height: 18px; border: 2px solid currentColor; border-radius: 4px; box-sizing: border-box; }
    .battery::after { content: ""; position: absolute; right: -4px; top: 4px; width: 3px; height: 8px; background: currentColor; border-radius: 1px; }
    .bars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 2px; height: 100%; }
    .bar { border-radius: 2px; background: currentColor; opacity: 0.35; transition: opacity 200ms ease, transform 200ms ease; }
    .bar.filled { opacity: 1; }
    :host([level="3"]) { color: #00c853; }
    :host([level="2"]) { color: #fdd835; }
    :host([level="1"]) { color: #fb8c00; }
    :host([level="0"]) { color: #e53935; }
    .bar.drain { transform: scaleY(0); opacity: 0.3; }
    .bar.fill { transform: scaleY(1.1); }
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
    // Only reflect STS mode in this bar
    if (e.detail.mode !== "sts") return;

    const old = this.level;
    const next = e.detail.level;
    if (old === next) return;

    // Determine which bar changed and the kind of change
    if (next < old) {
      this._changedIndex = old - 1; // drained last filled bar
      this._changeKind = "drain";
    } else {
      this._changedIndex = next - 1; // filled next bar
      this._changeKind = "fill";
    }

    this._animating = true;
    this.level = next;
    // end animation after short delay
    setTimeout(() => {
      this._animating = false;
      this._changedIndex = -1;
      this._changeKind = null;
    }, 250);
  };

  private _energyText(level: 0 | 1 | 2 | 3): string {
    switch (level) {
      case 3:
        return "Full";
      case 2:
        return "Medium";
      case 1:
        return "Low";
      default:
        return "Exhausted";
    }
  }

  render() {
    const filledCount = this.level;
    const bars = [0, 1, 2].map((i) => i < filledCount);
    const model = energyBarService.getModelForLevel(this.level, "sts");
    const ariaValueText = `${this._energyText(this.level)}${model ? ` — ${model}` : ""}`;

    return html`
      <div
        class="battery"
        role="meter"
        aria-valuemin="0"
        aria-valuemax="3"
        aria-valuenow=${String(this.level)}
        aria-valuetext=${ariaValueText}
        title=${`Energy: ${this.level}/3 (${this._energyText(this.level)})${model ? ` — ${model}` : ""}`}
      >
        <div class="bars">
          ${bars.map((filled, idx) => {
            const classes = ["bar"]; // base
            if (filled) classes.push("filled");
            if (
              this._animating &&
              idx === this._changedIndex &&
              this._changeKind
            ) {
              classes.push(this._changeKind);
            }
            return html`<div class=${classes.join(" ")}></div>`;
          })}
        </div>
      </div>
    `;
  }
}
