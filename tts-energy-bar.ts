import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  type EnergyLevelChangedDetail,
  energyBarService,
  TTSEnergyLevel,
} from "./src/energy-bar-service";

@customElement("tts-energy-bar")
export class TTSEnergyBar extends LitElement {
  @property({ type: Number, reflect: true }) level: 0 | 1 | 2 =
    energyBarService.getCurrentEnergyLevel("tts") as TTSEnergyLevel;

  @state() private _animating = false;
  @state() private _changedIndex: number = -1;
  @state() private _changeKind: "fill" | "drain" | null = null;

  static styles = css`
    :host { 
      display: inline-flex; 
      align-items: center; 
      gap: 8px; 
    }
    
    .battery { 
      position: relative; 
      width: 32px; 
      height: 16px; 
      border: 2px solid currentColor; 
      border-radius: 3px; 
      box-sizing: border-box; 
    }
    
    .battery::after { 
      content: ""; 
      position: absolute; 
      right: -3px; 
      top: 3px; 
      width: 2px; 
      height: 8px; 
      background: currentColor; 
      border-radius: 1px; 
    }
    
    .bars { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 2px; 
      padding: 2px; 
      height: 100%; 
    }
    
    .bar { 
      border-radius: 1px; 
      background: currentColor; 
      opacity: 0.35; 
      transition: opacity 200ms ease, transform 200ms ease; 
    }
    
    .bar.filled { 
      opacity: 1; 
    }
    
    /* TTS-specific colors for 3-level system */
    :host([level="2"]) { color: #00c853; } /* Green - Full */
    :host([level="1"]) { color: #fdd835; } /* Yellow - Degraded */
    :host([level="0"]) { color: #e53935; } /* Red - Exhausted */
    
    .bar.drain { 
      transform: scaleY(0); 
      opacity: 0.3; 
    }
    
    .bar.fill { 
      transform: scaleY(1.1); 
    }
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
    // Only reflect TTS mode in this bar
    if (e.detail.mode !== "tts") return;

    const old = this.level;
    const next = e.detail.level as 0 | 1 | 2;
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

  private _energyText(level: 0 | 1 | 2): string {
    switch (level) {
      case 2:
        return "Full";
      case 1:
        return "Degraded";
      default:
        return "Exhausted";
    }
  }

  render() {
    const filledCount = this.level;
    const bars = [0, 1].map((i) => i < filledCount);
    const model = energyBarService.getModelForLevel(this.level, "tts");
    const ariaValueText = `${this._energyText(this.level)}${model ? ` — ${model}` : ""}`;

    return html`
      <div
        class="battery"
        role="meter"
        aria-valuemin="0"
        aria-valuemax="2"
        aria-valuenow=${String(this.level)}
        aria-valuetext=${ariaValueText}
        title=${`Chat Energy: ${this.level}/2 (${this._energyText(this.level)})${model ? ` — ${model}` : ""}`}
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