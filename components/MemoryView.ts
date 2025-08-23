import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { Memory } from "@features/memory/Memory";
import { memoryService } from "app/main"; // Assuming memoryService is exported from main
import { createComponentLogger } from "@services/DebugLogger";

const logger = createComponentLogger("MemoryView");

@customElement("memory-view")
export class MemoryView extends LitElement {
  @state() private memories: Memory[] = [];
  @state() private isLoading = true;
  @state() private error: string | null = null;

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      background-color: var(--background-color, #1a1a1a);
      color: var(--text-color, #ffffff);
      height: 100%;
      overflow-y: auto;
    }

    .controls {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1rem;
    }

    .btn {
      background-color: var(--primary-color, #333);
      color: var(--text-color, #fff);
      border: 1px solid var(--primary-color, #444);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background-color 0.3s;
    }

    .btn-danger {
      background-color: #8b0000;
      border-color: #8b0000;
    }

    .btn:hover {
      background-color: var(--primary-color-hover, #444);
    }
    
    .btn-danger:hover {
        background-color: #a52a2a;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      background-color: var(--secondary-background-color, #2a2a2a);
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .memory-content {
      flex-grow: 1;
      font-family: monospace;
      font-size: 0.9em;
    }

    .memory-key {
      font-weight: bold;
      color: var(--primary-color, #a9a9a9);
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this.fetchMemories();
  }

  private async fetchMemories() {
    this.isLoading = true;
    this.error = null;
    try {
      this.memories = await memoryService.getAllMemories();
    } catch (e) {
      this.error = "Failed to load memories.";
      logger.error("Failed to fetch memories", { error: e });
    } finally {
      this.isLoading = false;
    }
  }

  private async deleteMemory(id: number) {
    try {
      await memoryService.deleteMemory(id);
      this.memories = this.memories.filter((m) => m.id !== id);
    } catch (e) {
      logger.error("Failed to delete memory", { id, error: e });
      // Optionally, show a toast notification for the error
    }
  }

  private async deleteAllMemories() {
    const confirmed = window.confirm(
      "Are you sure you want to delete all memories? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      await memoryService.deleteAllMemories();
      this.memories = [];
    } catch (e) {
      logger.error("Failed to delete all memories", { error: e });
      // Optionally, show a toast notification for the error
    }
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