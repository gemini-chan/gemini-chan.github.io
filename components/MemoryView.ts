import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Memory } from "@features/memory/Memory";
import { createComponentLogger } from "@services/DebugLogger";
import type { IMemoryService } from "@features/memory/MemoryService";

const logger = createComponentLogger("MemoryView");

@customElement("memory-view")
export class MemoryView extends LitElement {
  @property({ attribute: false })
  memoryService!: IMemoryService;

  @state() private memories: Memory[] = [];
  @state() private isLoading = true;
  @state() private error: string | null = null;
  @state() private vpuDebugMode = false;

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
      background: transparent;
    }

    .controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .debug-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      cursor: pointer;
    }

    .debug-toggle input {
      margin: 0;
      width: 16px;
      height: 16px;
    }

    /* Ethereal buttons, aligned with ChatView */
    .btn {
      outline: none;
      border: 1px solid var(--cp-surface-border);
      color: var(--cp-text);
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(0,229,255,0.15), rgba(124,77,255,0.15));
      padding: 8px 14px;
      cursor: pointer;
      font: 14px/1.4 system-ui;
      box-shadow: var(--cp-glow-cyan);
      backdrop-filter: blur(4px);
      transition: transform 0.15s ease, background 0.15s ease;
    }

    .btn:hover {
      background: linear-gradient(135deg, rgba(0,229,255,0.22), rgba(124,77,255,0.22));
      transform: translateY(-1px);
    }

    .btn-danger {
      border: 1px solid var(--cp-surface-border-2);
      background: linear-gradient(135deg, rgba(255,0,229,0.18), rgba(124,77,255,0.16));
      box-shadow: var(--cp-glow-magenta);
      color: var(--cp-text);
    }

    .btn-danger:hover {
      background: linear-gradient(135deg, rgba(255,0,229,0.25), rgba(124,77,255,0.22));
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
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
    ul::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ul::-webkit-scrollbar-track {
      background-color: var(--cp-surface);
      border-radius: 4px;
    }

    ul::-webkit-scrollbar-thumb {
      background-color: var(--cp-surface-strong);
      border-radius: 4px;
      border: 1px solid transparent;
      background-clip: content-box;
    }

    ul::-webkit-scrollbar-thumb:hover {
      background-color: var(--cp-cyan);
      box-shadow: var(--cp-glow-cyan);
    }

    li {
      padding: 12px;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border: 1px solid var(--cp-surface-border);
      background: linear-gradient(135deg, rgba(0, 229, 255, 0.16), rgba(124, 77, 255, 0.14));
      box-shadow: var(--cp-glow-purple);
      color: var(--cp-text);
    }

    .memory-content {
      flex: 1;
      font: 14px/1.5 monospace;
      white-space: pre-wrap;
    }

    .memory-key {
      font: 600 14px/1.4 system-ui;
      color: var(--cp-cyan);
      margin-right: 6px;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this.fetchMemories();
  }

  private async fetchMemories() {
    if (!this.memoryService) {
      this.error = "Memory service is not available.";
      this.isLoading = false;
      return;
    }
    this.isLoading = true;
    this.error = null;
    try {
      this.memories = await this.memoryService.getAllMemories();
    } catch (e) {
      this.error = "Failed to load memories.";
      logger.error("Failed to fetch memories", { error: e });
    } finally {
      this.isLoading = false;
    }
  }

  private async deleteMemory(id: number) {
    if (!this.memoryService) return;
    try {
      await this.memoryService.deleteMemory(id);
      this.memories = this.memories.filter((m) => m.id !== id);
    } catch (e) {
      logger.error("Failed to delete memory", { id, error: e });
      // Optionally, show a toast notification for the error
    }
  }

  private async deleteAllMemories() {
    if (!this.memoryService) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete all memories? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      await this.memoryService.deleteAllMemories();
      this.memories = [];
    } catch (e) {
      logger.error("Failed to delete all memories", { error: e });
      // Optionally, show a toast notification for the error
    }
  }

  private _handleDebugToggle(e: Event) {
    const target = e.target as HTMLInputElement;
    this.vpuDebugMode = target.checked;
    this.dispatchEvent(
      new CustomEvent("vpu-debug-toggle", {
        detail: { enabled: this.vpuDebugMode },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (this.isLoading) {
      return html`<p>Loading memories...</p>`;
    }

    if (this.error) {
      return html`<p class="error">${this.error}</p>`;
    }

    return html`
      <div class="controls">
        <label class="debug-toggle">
          <input
            type="checkbox"
            .checked=${this.vpuDebugMode}
            @change=${this._handleDebugToggle}
          />
          VPU Debug Mode
        </label>
        <button class="btn btn-danger" @click=${this.deleteAllMemories}>
          Forget Everything
        </button>
      </div>
      <ul>
        ${this.memories.length === 0
          ? html`<p>No memories found.</p>`
          : this.memories.map(
              (memory) => html`
                <li>
                  <div class="memory-content">
                    <span class="memory-key">${memory.fact_key}:</span>
                    <span>${memory.fact_value}</span>
                  </div>
                  <button class="btn" @click=${() => this.deleteMemory(memory.id!)}>
                    Forget
                  </button>
                </li>
              `
            )}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "memory-view": MemoryView;
  }
}