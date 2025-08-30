/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GdmLiveAudio } from './main.tsx';

// Define type aliases for turn state
export type TurnPhase = 'idle' | 'npu' | 'vpu' | 'complete' | 'error';
export interface TurnState { 
  id: string | null; 
  phase: TurnPhase; 
  startedAt: number; 
  lastUpdateAt: number; 
}

export class TurnManager {
  private host: GdmLiveAudio; // GdmLiveAudio instance
  public vpuWatchdogTimer: number | null = null;
  public vpuHardDeadline = 0;
  public vpuHardMaxTimer: number | null = null;
  private readonly VPU_WATCHDOG_MS = 15000;
  private readonly VPU_HARD_MAX_MS = 25000;
  public EVENT_STATUS_MAP: Record<string, string> = { 
    'npu:thought': 'Thinking (Thought)...', 
    'npu:audio-out': 'Thinking (Audio)...' 
  };
  
  // VPU dev ticker methods
  public armVpuDevTicker() {
    this.host._armDevRaf();
  }
  
  public clearVpuDevTicker() {
    // RAF continues running in dev for visibility - no-op here
  }

  constructor(host: GdmLiveAudio) {
    this.host = host;
  }

  initializeNewTurn(message: string): string {
    // Generate turn ID before appending user message
    const turnId = crypto?.randomUUID?.() ?? `t-${Date.now()}`;
    
    // Add message to text transcript with turnId
    this.host.textTranscript = [
      ...this.host.textTranscript,
      { text: message, speaker: "user", turnId }
    ];

    // Initialize status to clock (analyzing)
    this.host.messageStatuses = { ...this.host.messageStatuses, [turnId]: 'clock' };

    // Prune message metadata maps
    this.host._pruneMessageMeta();

    // Set initial thinking state BEFORE any awaits
    this.host.npuThinkingLog = "";
    this.host.npuStatus = "Thinking…";
    this.host.thinkingActive = true;
    
    // Initialize turn state machine
    this.host.turnState = {
      id: turnId,
      phase: 'npu',
      startedAt: Date.now(),
      lastUpdateAt: Date.now()
    };
    
    return turnId;
  }

  setTurnPhase(phase: 'idle'|'npu'|'vpu'|'complete'|'error', eventType?: string) {
    const turnId = this.host.turnState.id;
    const previousPhase = this.host.turnState.phase;
    const now = Date.now();
    this.host.turnState = {
      ...this.host.turnState,
      phase,
      lastUpdateAt: now
    };
    
    // Log phase transition
    if (previousPhase !== phase) {
      console.debug("Turn phase transition", { 
        turnId: this.host.turnState.id, 
        from: previousPhase, 
        to: phase, 
        eventType 
      });
    }
    
    switch (phase) {
      case 'npu':
        this.host.thinkingActive = true;
        this.host.npuStatus = this.host.EVENT_STATUS_MAP[eventType] || 'Thinking...';
        console.debug('Status badge updated', { status: this.host.npuStatus });
        break;
      case 'vpu':
        this.host.thinkingActive = true;
        this.host.npuStatus = "Speaking…";
        break;
      case 'complete':
        this.host.thinkingActive = false;
        this.host.npuStatus = "";
        this.host.npuSubStatus = "";
        this.host.npuThinkingLog = "";
        this.host.devRemainingMs = 0;
        this.clearVpuDevTicker();
        
        // Set timeout to transition to idle after 1500ms
        setTimeout(() => {
          if (this.host.turnState.id === turnId && this.host.turnState.phase === 'complete') {
            this.setTurnPhase('idle');
          }
        }, this.host.COMPLETE_TO_IDLE_DELAY_MS);
        break;
      case 'error':
        this.host.thinkingActive = false;
        this.host.npuStatus = "";
        this.host.npuSubStatus = "";
        this.host.devRemainingMs = 0;
        this.clearVpuDevTicker();
        
        // Set timeout to transition to idle after 2500ms
        setTimeout(() => {
          if (this.host.turnState.id === turnId && this.host.turnState.phase === 'error') {
            this.setTurnPhase('idle');
          }
        }, this.host.ERROR_TO_IDLE_DELAY_MS);
        break;
      case 'idle':
        this.host.thinkingActive = false;
        this.host.npuStatus = "";
        this.host.npuSubStatus = "";
        this.host.npuThinkingLog = ""; // Clear thinking log text
        this.host.devRemainingMs = 0;
        this.clearVpuDevTicker();
        break;
    }
    
    this.host._scheduleUpdate();
  }

  public resetVpuWatchdog() {
    // Clear existing timer
    if (this.vpuWatchdogTimer) {
      clearTimeout(this.vpuWatchdogTimer);
    }
    
    // Set new timer only if we're in VPU phase
    if (this.host.turnState.phase === 'vpu' && this.host.turnState.id) {
      console.debug("VPU watchdog armed", { 
        turnId: this.host.turnState.id, 
        timeoutMs: this.VPU_WATCHDOG_MS 
      });
      this.vpuWatchdogTimer = window.setTimeout(() => {
        // Only trigger if this is still the current turn
        if (this.host.turnState.id && this.host.turnState.phase === 'vpu') {
          console.debug("VPU watchdog fired", { turnId: this.host.turnState.id });
          this.setTurnPhase('complete');
        }
        this.vpuWatchdogTimer = null;
      }, this.VPU_WATCHDOG_MS);
    }
  }
  
  public clearVpuWatchdog() {
    if (this.vpuWatchdogTimer) {
      clearTimeout(this.vpuWatchdogTimer);
      this.vpuWatchdogTimer = null;
    }
  }
  
  public armVpuHardMaxTimer() {
    // Always clear any existing timer before setting a new one
    this.clearVpuHardMaxTimer(true); // silent clear
    
    // Set new hard max timer
    if (this.host.turnState.id) {
      this.vpuHardDeadline = Date.now() + this.VPU_HARD_MAX_MS;
      console.debug("VPU hard max armed", { 
        turnId: this.host.turnState.id, 
        deadline: new Date(this.vpuHardDeadline).toISOString(),
        timeoutMs: this.VPU_HARD_MAX_MS 
      });
      this.vpuHardMaxTimer = window.setTimeout(() => {
        console.debug("VPU HARD TIMEOUT fired", { turnId: this.host.turnState.id });
        // Only trigger if this is still the current turn
        if (this.host.turnState.id && this.host.turnState.phase === 'vpu') {
          this.setTurnPhase('complete');
        }
        this.vpuHardMaxTimer = null;
        this.vpuHardDeadline = 0;
      }, this.VPU_HARD_MAX_MS);
    }
  }
  
  public clearVpuHardMaxTimer(silent = false) {
    if (this.vpuHardMaxTimer) {
      clearTimeout(this.vpuHardMaxTimer);
      this.vpuHardMaxTimer = null;
      if (!silent) {
        console.debug("VPU hard max timer cleared", {
          turnId: this.host.turnState.id
        });
      }
      this.vpuHardDeadline = 0;
    }
  }
  
  public armVpuWatchdog() {
    this.clearVpuWatchdog();
    this.vpuWatchdogTimer = window.setTimeout(() => {
      console.warn('VPU watchdog triggered');
      this.setTurnPhase('idle');
    }, this.VPU_WATCHDOG_MS);
  }

}
