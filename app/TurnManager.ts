/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Define type aliases for turn state
export type TurnPhase = 'idle' | 'npu' | 'vpu' | 'complete' | 'error';
export interface TurnState { 
  id: string | null; 
  phase: TurnPhase; 
  startedAt: number; 
  lastUpdateAt: number; 
}

export class TurnManager {
  private host: any; // GdmLiveAudio instance

  constructor(host: any) {
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
        this.host._clearVpuDevTicker();
        // Clear dev state
        this.host.vpuHardDeadline = 0;
        
        // Set timeout to transition to idle after 1500ms
        setTimeout(() => {
          if (this.host.turnState.id === this.host.currentTurnId && this.host.turnState.phase === 'complete') {
            this.setTurnPhase('idle');
          }
        }, this.host.COMPLETE_TO_IDLE_DELAY_MS);
        break;
      case 'error':
        this.host.thinkingActive = false;
        this.host.npuStatus = "";
        this.host.npuSubStatus = "";
        this.host.devRemainingMs = 0;
        this.host._clearVpuDevTicker();
        // Clear dev state
        this.host.vpuHardDeadline = 0;
        
        // Set timeout to transition to idle after 2500ms
        setTimeout(() => {
          if (this.host.turnState.id === this.host.currentTurnId && this.host.turnState.phase === 'error') {
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
        this.host._clearVpuDevTicker();
        // Clear dev state
        this.host.vpuHardDeadline = 0;
        break;
    }
    
    this.host._scheduleUpdate();
  }
}
