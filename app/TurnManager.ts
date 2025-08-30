/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Turn } from '@shared/types';

// Define type aliases for turn state
export type TurnPhase = 'idle' | 'npu' | 'vpu' | 'complete' | 'error';
export interface TurnState {
	id: string | null;
	phase: TurnPhase;
	startedAt: number;
	lastUpdateAt: number;
}

export interface TurnManagerDependencies {
	getState: () => {
		turnState: TurnState;
		textTranscript: Turn[];
		messageStatuses: Record<string, "clock" | "single" | "double" | "error">;
	};
	setState: (
		newState: Partial<{
			textTranscript: Turn[];
			messageStatuses: Record<string, "clock" | "single" | "double" | "error">;
			npuThinkingLog: string;
			npuStatus: string;
			thinkingActive: boolean;
			turnState: TurnState;
			npuSubStatus: string;
			devRemainingMs: number;
		}>,
	) => void;
	pruneMessageMeta: () => void;
	armDevRaf: () => void;
	scheduleUpdate: () => void;
	readonly COMPLETE_TO_IDLE_DELAY_MS: number;
	readonly ERROR_TO_IDLE_DELAY_MS: number;
}

export class TurnManager {
	public static readonly EVENT_STATUS_MAP: Record<string, string> = {
		"npu:thought": "Thinking (Thought)...",
		"npu:audio-out": "Thinking (Audio)...",
	};

	private deps: TurnManagerDependencies;
	public vpuWatchdogTimer: number | null = null;
  public vpuHardDeadline = 0;
 public vpuHardMaxTimer: number | null = null;
 private readonly VPU_WATCHDOG_MS = 15000;
 private readonly VPU_HARD_MAX_MS = 25000;

 // VPU dev ticker methods
 public armVpuDevTicker() {
  this.deps.armDevRaf();
 }

 public clearVpuDevTicker() {
  // RAF continues running in dev for visibility - no-op here
 }

 constructor(deps: TurnManagerDependencies) {
  this.deps = deps;
 }

 initializeNewTurn(message: string): string {
  // Generate turn ID before appending user message
  const turnId = crypto?.randomUUID?.() ?? `t-${Date.now()}`;

  const { textTranscript, messageStatuses } = this.deps.getState();

  // Add message to text transcript with turnId
  this.deps.setState({
  	textTranscript: [
  		...textTranscript,
  		{ text: message, speaker: "user", turnId },
  	],
  	// Initialize status to clock (analyzing)
  	messageStatuses: { ...messageStatuses, [turnId]: "clock" },
  });

  // Prune message metadata maps
  this.deps.pruneMessageMeta();

  // Set initial thinking state BEFORE any awaits
  this.deps.setState({
  	npuThinkingLog: "",
  	npuStatus: "Thinking…",
  	thinkingActive: true,
  	// Initialize turn state machine
  	turnState: {
  		id: turnId,
  		phase: "npu",
  		startedAt: Date.now(),
  		lastUpdateAt: Date.now(),
  	},
  });

  return turnId;
 }

 setTurnPhase(
  phase: "idle" | "npu" | "vpu" | "complete" | "error",
  eventType?: string,
 ) {
  const { turnState } = this.deps.getState();
  const turnId = turnState.id;
  const previousPhase = turnState.phase;
  const now = Date.now();

  const newTurnState = {
  	...turnState,
  	phase,
  	lastUpdateAt: now,
  };

  // Log phase transition
  if (previousPhase !== phase) {
  	console.debug("Turn phase transition", {
  		turnId: turnId,
  		from: previousPhase,
  		to: phase,
  		eventType,
  	});
  }

  let stateUpdate: Parameters<TurnManagerDependencies["setState"]>[0] = {
  	turnState: newTurnState,
  };

  switch (phase) {
  	case "npu":
  		stateUpdate = {
  			...stateUpdate,
  			thinkingActive: true,
  			npuStatus:
  				TurnManager.EVENT_STATUS_MAP[eventType] || "Thinking...",
  		};
  		console.debug("Status badge updated", {
  			status: stateUpdate.npuStatus,
  		});
  		break;
  	case "vpu":
  		stateUpdate = {
  			...stateUpdate,
  			thinkingActive: true,
  			npuStatus: "Speaking…",
  		};
  		break;
  	case "complete":
  		stateUpdate = {
  			...stateUpdate,
  			thinkingActive: false,
  			npuStatus: "",
  			npuSubStatus: "",
  			npuThinkingLog: "",
  			devRemainingMs: 0,
  		};
  		this.clearVpuDevTicker();

  		// Set timeout to transition to idle after 1500ms
  		setTimeout(() => {
  			if (
  				this.deps.getState().turnState.id === turnId &&
  				this.deps.getState().turnState.phase === "complete"
  			) {
  				this.setTurnPhase("idle");
  			}
  		}, this.deps.COMPLETE_TO_IDLE_DELAY_MS);
  		break;
  	case "error":
  		stateUpdate = {
  			...stateUpdate,
  			thinkingActive: false,
  			npuStatus: "",
  			npuSubStatus: "",
  			devRemainingMs: 0,
  		};
  		this.clearVpuDevTicker();

  		// Set timeout to transition to idle after 2500ms
  		setTimeout(() => {
  			if (
  				this.deps.getState().turnState.id === turnId &&
  				this.deps.getState().turnState.phase === "error"
  			) {
  				this.setTurnPhase("idle");
  			}
  		}, this.deps.ERROR_TO_IDLE_DELAY_MS);
  		break;
  	case "idle":
  		stateUpdate = {
  			...stateUpdate,
  			thinkingActive: false,
  			npuStatus: "",
  			npuSubStatus: "",
  			npuThinkingLog: "", // Clear thinking log text
  			devRemainingMs: 0,
  		};
  		this.clearVpuDevTicker();
  		break;
  }

  this.deps.setState(stateUpdate);
  this.deps.scheduleUpdate();
 }

 public resetVpuWatchdog() {
  // Clear existing timer
  if (this.vpuWatchdogTimer) {
  	clearTimeout(this.vpuWatchdogTimer);
  }

  const { turnState } = this.deps.getState();

  // Set new timer only if we're in VPU phase
  if (turnState.phase === "vpu" && turnState.id) {
  	console.debug("VPU watchdog armed", {
  		turnId: turnState.id,
  		timeoutMs: this.VPU_WATCHDOG_MS,
  	});
  	this.vpuWatchdogTimer = window.setTimeout(() => {
  		const currentTurnState = this.deps.getState().turnState;
  		// Only trigger if this is still the current turn
  		if (currentTurnState.id && currentTurnState.phase === "vpu") {
  			console.debug("VPU watchdog fired", {
  				turnId: currentTurnState.id,
  			});
  			this.setTurnPhase("complete");
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
  
    const { turnState } = this.deps.getState();
  
    // Set new hard max timer
    if (turnState.id) {
      this.vpuHardDeadline = Date.now() + this.VPU_HARD_MAX_MS;
      console.debug("VPU hard max armed", {
        turnId: turnState.id,
        deadline: new Date(this.vpuHardDeadline).toISOString(),
        timeoutMs: this.VPU_HARD_MAX_MS,
      });
      this.vpuHardMaxTimer = window.setTimeout(() => {
        const currentTurnState = this.deps.getState().turnState;
        console.debug("VPU HARD TIMEOUT fired", {
          turnId: currentTurnState.id,
        });
        // Only trigger if this is still the current turn
        if (currentTurnState.id && currentTurnState.phase === "vpu") {
          this.setTurnPhase("complete");
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
          turnId: this.deps.getState().turnState.id,
        });
      }
      this.vpuHardDeadline = 0;
    }
  }
  
}
