import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Memory } from "@features/memory/Memory";
import { createComponentLogger } from "@services/DebugLogger";
import { healthMetricsService } from "@services/HealthMetricsService";
import type { HealthMetrics } from "@services/HealthMetricsService";
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
  @state() private npuDebugMode = false;
  @state() private showHealthMetrics = false;
  @state() private healthMetrics: Partial<HealthMetrics> = {};

  // Config object for memory scoring constants
  private readonly MEMORY_SCORING_CONFIG = {
    // Permanence weights
    PERMANENCE_PERMANENT_BOOST: 2,
    PERMANENCE_TEMPORARY_BOOST: 0.5,
    PERMANENCE_CONTEXTUAL_BOOST: 1,
    
    // Multipliers for sorting
    REINFORCEMENT_MULTIPLIER: 100,
    RECENCY_DIVISOR: 1e10,
    
    // Stability scoring weights
    STABILITY_PERMANENCE_WEIGHT: 1.0,
    STABILITY_REINFORCEMENT_WEIGHT: 0.5,
    STABILITY_RECENCY_WEIGHT: 0.5,
    STABILITY_THRESHOLD: 2.5, // Threshold for stable memories
    
    // Recency decay
    RECENCY_DECAY_DAYS: 30, // Days for recency score decay
    MILLISECONDS_PER_DAY: 1000 * 60 * 60 * 24, // Milliseconds in a day
    SORTING_PERMANENCE_MULTIPLIER: 1000 // Multiplier for permanence in sorting
  };

  static styles = css`
    @keyframes stable-pulse {
      0% { box-shadow: var(--cp-glow-purple); }
      50% { box-shadow: 0 0 12px rgba(0, 229, 255, 0.55), 0 0 20px rgba(124, 77, 255, 0.35); }
      100% { box-shadow: var(--cp-glow-purple); }
    }
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

    .health-metrics {
      padding: 12px;
      border-radius: 10px;
      border: 1px solid var(--cp-surface-border);
      background: linear-gradient(135deg, rgba(0, 229, 255, 0.16), rgba(124, 77, 255, 0.14));
      box-shadow: var(--cp-glow-purple);
      margin-bottom: 12px;
    }

    .health-metrics h3 {
      margin: 0 0 12px 0;
      color: var(--cp-cyan);
      font-size: 16px;
      font-weight: 600;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.2);
    }

    .metric-label {
      font-size: 14px;
      color: var(--cp-text);
    }

    .metric-value {
      font-size: 14px;
      font-weight: 600;
      color: var(--cp-cyan);
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
      position: relative;
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

   li.stable { animation: stable-pulse 2.6s ease-in-out infinite; }

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

    .memory-actions {
      display: flex;
      gap: 8px;
    }

    .health-metrics-display {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .health-metric-reinforce {
      font-size: 12px;
      color: var(--cp-text);
      opacity: 0.8;
    }
    
    .health-metric-stability {
      font-size: 12px;
      color: var(--cp-cyan);
      font-weight: 600;
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
     const raw = await this.memoryService.getAllMemories();
     // Sort by persistence: permanence (permanent first), then reinforcement_count desc, then recency desc
     this.memories = raw.sort((a, b) => this.calculateMemorySortScore(b) - this.calculateMemorySortScore(a));
      // Update health metrics when fetching memories
      this.healthMetrics = healthMetricsService.getAverageMetrics();
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
      // Update health metrics after deleting memory
      this.healthMetrics = healthMetricsService.getAverageMetrics();
    } catch (e) {
      logger.error("Failed to delete memory", { id, error: e });
      // Optionally, show a toast notification for the error
    }
  }

  private async pinMemory(id: number) {
    if (!this.memoryService) return;
    try {
      await this.memoryService.pinMemory(id);
      // Update the specific memory in the local state to show updated permanence score
      this.memories = this.memories.map(m => m.id === id ? { ...m, permanence_score: 'permanent' } : m);
    } catch (e) {
      logger.error("Failed to pin memory", { id, error: e });
    }
  }

  private async unpinMemory(id: number) {
    if (!this.memoryService) return;
    try {
      await this.memoryService.unpinMemory(id);
      // Update the specific memory in the local state to show updated permanence score
      this.memories = this.memories.map(m => m.id === id ? { ...m, permanence_score: 'contextual' } : m);
    } catch (e) {
      logger.error("Failed to unpin memory", { id, error: e });
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
      // Update health metrics after deleting all memories
      this.healthMetrics = healthMetricsService.getAverageMetrics();
    } catch (e) {
      logger.error("Failed to delete all memories", { error: e });
      // Optionally, show a toast notification for the error
    }
  }

  private toggleHealthMetrics() {
    this.showHealthMetrics = !this.showHealthMetrics;
    if (this.showHealthMetrics) {
      this.healthMetrics = healthMetricsService.getAverageMetrics();
    }
    // Tie debug modes to health metrics toggle
    this.vpuDebugMode = this.showHealthMetrics;
    this.npuDebugMode = this.showHealthMetrics;
    // Dispatch events for both debug modes
    this.dispatchEvent(new CustomEvent('vpu-debug-toggle', {
      detail: { enabled: this.showHealthMetrics },
      bubbles: true,
      composed: true
    }));
    this.dispatchEvent(new CustomEvent('npu-debug-toggle', {
      detail: { enabled: this.showHealthMetrics },
      bubbles: true,
      composed: true
    }));
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
        <div style="display: flex; gap: 16px;">
          <div class="debug-toggle" @click=${this.toggleHealthMetrics}>
            <input type="checkbox" .checked=${this.showHealthMetrics} />
            <span>Show Health Metrics</span>
          </div>
        </div>
        <button class="btn btn-danger" @click=${this.deleteAllMemories}>
          Forget Everything
        </button>
      </div>
      
      ${this.showHealthMetrics
        ? html`
            <div class="health-metrics">
              <h3>Health Metrics</h3>
              <div class="metrics-grid">
                <div class="metric">
                  <span class="metric-label">NPU Latency:</span>
                  <span class="metric-value">
                    ${this.healthMetrics.npuLatency !== undefined
                      ? `${this.healthMetrics.npuLatency.toFixed(2)}ms`
                      : "N/A"}
                  </span>
                </div>
                <div class="metric">
                  <span class="metric-label">VPU Start Latency:</span>
                  <span class="metric-value">
                    ${this.healthMetrics.vpuStartLatency !== undefined
                      ? `${this.healthMetrics.vpuStartLatency.toFixed(2)}ms`
                      : "N/A"}
                  </span>
                </div>
                <div class="metric">
                  <span class="metric-label">MPU Turnaround:</span>
                  <span class="metric-value">
                    ${this.healthMetrics.mpuTurnaround !== undefined
                      ? `${this.healthMetrics.mpuTurnaround.toFixed(2)}ms`
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          `
        : ""}
      
      <ul>
        ${this.memories.length === 0
          ? html`<p>No memories found.</p>`
          : this.memories.map(
            (memory) => {
              // Stability score (derived): permanence weight + reinforcement + recency factor
              const { stabilityScore, reinforcement } = this.calculateMemoryStabilityDetails(memory);

              const titleStr = this.showHealthMetrics
                ? `reinforce: ${reinforcement.toFixed(2)} | stability: ${stabilityScore.toFixed(2)}`
                : `${memory.fact_key}: ${memory.fact_value}`;
              const cls = stabilityScore >= this.MEMORY_SCORING_CONFIG.STABILITY_THRESHOLD ? 'stable' : '';

              return html`
                <li title=${titleStr} class=${cls}>
                  <div class="memory-content">
                    <span class="memory-key">${memory.fact_key}:</span>
                    <span>${memory.fact_value}</span>
                  </div>
                  ${this.showHealthMetrics ? html`<div class="health-metrics-display">
                     <span class="health-metric-reinforce">reinforce: ${(memory.reinforcement_count||0).toFixed(2)}</span>
                     <span class="health-metric-stability">stability: ${stabilityScore.toFixed(2)}</span>
                   </div>` : ""}
                  <div class="memory-actions">
                    ${memory.permanence_score === "permanent"
                      ? html`<button class="btn" @click=${() => this.unpinMemory(memory.id!)}>Unpin</button>`
                      : html`<button class="btn" @click=${() => this.pinMemory(memory.id!)}>Pin</button>`}
                    <button class="btn" @click=${() => this.deleteMemory(memory.id!)}>
                      Forget
                    </button>
                  </div>
                </li>
              `;
            })
      }
      </ul>
    `;
  }

  /**
   * Calculate the permanence weight for a memory based on its permanence score
   * @param permanenceScore The permanence score of the memory
   * @returns The calculated permanence weight
   */
  private getPermanenceWeight(permanenceScore?: string): number {
    switch (permanenceScore) {
      case 'permanent':
        return this.MEMORY_SCORING_CONFIG.PERMANENCE_PERMANENT_BOOST;
      case 'temporary':
        return this.MEMORY_SCORING_CONFIG.PERMANENCE_TEMPORARY_BOOST;
      case 'contextual':
      default:
        return this.MEMORY_SCORING_CONFIG.PERMANENCE_CONTEXTUAL_BOOST;
    }
  }

  /**
   * Calculate stability details for a memory including the stability score and reinforcement count
   * This is used to determine if a memory is "stable" and should be visually highlighted
   * @param memory The memory to calculate the stability details for
   * @returns An object containing the stability score and reinforcement count
   */
  private calculateMemoryStabilityDetails(memory: Memory): { stabilityScore: number; reinforcement: number } {
    const permanenceWeight = this.getPermanenceWeight(memory.permanence_score);
    const reinforcement = memory.reinforcement_count || 0;
    const recency = memory.timestamp ? (Date.now() - new Date(memory.timestamp).getTime()) : Number.MAX_SAFE_INTEGER;
    const recencyScore = recency > 0 ? Math.max(0, 1 - recency / (this.MEMORY_SCORING_CONFIG.MILLISECONDS_PER_DAY * this.MEMORY_SCORING_CONFIG.RECENCY_DECAY_DAYS)) : 1; // decay over specified days
    const stabilityScore = (permanenceWeight * this.MEMORY_SCORING_CONFIG.STABILITY_PERMANENCE_WEIGHT) + (reinforcement * this.MEMORY_SCORING_CONFIG.STABILITY_REINFORCEMENT_WEIGHT) + (recencyScore * this.MEMORY_SCORING_CONFIG.STABILITY_RECENCY_WEIGHT);
    return { stabilityScore, reinforcement };
  }

  /**
   * Calculate a sort score for a memory based on permanence, reinforcement, and recency
   * This score is used to sort memories by persistence:
   * - Permanence (permanent first)
   * - Reinforcement count (descending)
   * - Recency (newer first)
   * @param memory The memory to calculate the score for
   * @returns The calculated sort score
   */
  private calculateMemorySortScore(memory: Memory): number {
    const permanenceBoost = this.getPermanenceWeight(memory.permanence_score);
    const reinforcement = memory.reinforcement_count || 0;
    const recency = memory.timestamp ? new Date(memory.timestamp).getTime() : 0;
    return permanenceBoost * this.MEMORY_SCORING_CONFIG.SORTING_PERMANENCE_MULTIPLIER + reinforcement * this.MEMORY_SCORING_CONFIG.REINFORCEMENT_MULTIPLIER + recency / this.MEMORY_SCORING_CONFIG.RECENCY_DIVISOR;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "memory-view": MemoryView;
  }
}
