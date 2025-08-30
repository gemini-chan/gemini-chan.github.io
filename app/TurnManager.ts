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
	hostElement: HTMLElement;
	pruneMessageMeta: () => void;
	armDevRaf: () => void;
	readonly COMPLETE_TO_IDLE_DELAY_MS: number;
	readonly ERROR_TO_IDLE_DELAY_MS: number;
}

export class TurnManager {
	public static readonly EVENT_STATUS_MAP: Record<string, string> = {
		"npu:thought": "Thinking (Thought)...",
		"npu:audio-out": "Thinking (Audio)...",
	};

	// Public state properties
	public npuThinkingLog: string = "";
	public npuStatus: string = "";
	public npuSubStatus: string = "";
	public thinkingActive: boolean = false;
	public turnState: TurnState = { id: null, phase: 'idle', startedAt: 0, lastUpdateAt: 0 };
	public devRemainingMs: number = 0;

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

		// Prune message metadata maps
		this.deps.pruneMessageMeta();

		// Set initial thinking state
		this.npuThinkingLog = "";
		this.npuStatus = "Thinking…";
		this.thinkingActive = true;
		// Initialize turn state machine
		this.turnState = {
			id: turnId,
			phase: "npu",
			startedAt: Date.now(),
			lastUpdateAt: Date.now(),
		};

		return turnId;
	}

	setTurnPhase(
		phase: "idle" | "npu" | "vpu" | "complete" | "error",
		eventType?: string,
	) {
		const turnId = this.turnState.id;
		const previousPhase = this.turnState.phase;
		const now = Date.now();

		const newTurnState = {
			...this.turnState,
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

		// Update internal state directly
		this.turnState = newTurnState;

		switch (phase) {
			case "npu":
				this.thinkingActive = true;
				this.npuStatus = TurnManager.EVENT_STATUS_MAP[eventType] || "Thinking...";
				console.debug("Status badge updated", {
					status: this.npuStatus,
				});
				break;
			case "vpu":
				this.thinkingActive = true;
				this.npuStatus = "Speaking…";
				break;
			case "complete":
				this.thinkingActive = false;
				this.npuStatus = "";
				this.npuSubStatus = "";
				this.npuThinkingLog = "";
				this.devRemainingMs = 0;
				this.clearVpuDevTicker();

				// Set timeout to transition to idle after 1500ms
				setTimeout(() => {
					if (
						this.turnState.id === turnId &&
						this.turnState.phase === "complete"
					) {
						this.setTurnPhase("idle");
					}
				}, this.deps.COMPLETE_TO_IDLE_DELAY_MS);
				break;
			case "error":
				this.thinkingActive = false;
				this.npuStatus = "";
				this.npuSubStatus = "";
				this.devRemainingMs = 0;
				this.clearVpuDevTicker();

				// Set timeout to transition to idle after 2500ms
				setTimeout(() => {
					if (
						this.turnState.id === turnId &&
						this.turnState.phase === "error"
					) {
						this.setTurnPhase("idle");
					}
				}, this.deps.ERROR_TO_IDLE_DELAY_MS);
				break;
			case "idle":
				this.thinkingActive = false;
				this.npuStatus = "";
				this.npuSubStatus = "";
				this.npuThinkingLog = ""; // Clear thinking log text
				this.devRemainingMs = 0;
				this.clearVpuDevTicker();
				break;
		}

		this.deps.hostElement.dispatchEvent(new CustomEvent('state-update', { bubbles: true, composed: true }));
	}

	public resetVpuWatchdog() {
		// Clear existing timer
		if (this.vpuWatchdogTimer) {
			clearTimeout(this.vpuWatchdogTimer);
		}

		// Set new timer only if we're in VPU phase
		if (this.turnState.phase === "vpu" && this.turnState.id) {
			console.debug("VPU watchdog armed", {
				turnId: this.turnState.id,
				timeoutMs: this.VPU_WATCHDOG_MS,
			});
			this.vpuWatchdogTimer = window.setTimeout(() => {
				// Only trigger if this is still the current turn
				if (this.turnState.id && this.turnState.phase === "vpu") {
					console.debug("VPU watchdog fired", {
						turnId: this.turnState.id,
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

		// Set new hard max timer
		if (this.turnState.id) {
			this.vpuHardDeadline = Date.now() + this.VPU_HARD_MAX_MS;
			console.debug("VPU hard max armed", {
				turnId: this.turnState.id,
				deadline: new Date(this.vpuHardDeadline).toISOString(),
				timeoutMs: this.VPU_HARD_MAX_MS,
			});
			this.vpuHardMaxTimer = window.setTimeout(() => {
				console.debug("VPU HARD TIMEOUT fired", {
					turnId: this.turnState.id,
				});
				// Only trigger if this is still the current turn
				if (this.turnState.id && this.turnState.phase === "vpu") {
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
					turnId: this.turnState.id,
				});
			}
			this.vpuHardDeadline = 0;
		}
	}

	public reset() {
		this.npuThinkingLog = "";
		this.npuStatus = "";
		this.npuSubStatus = "";
		this.thinkingActive = false;
		this.turnState = { id: null, phase: 'idle', startedAt: 0, lastUpdateAt: 0 };
		this.devRemainingMs = 0;
		this.clearVpuWatchdog();
		this.clearVpuHardMaxTimer();
		this.clearVpuDevTicker();
	}
}
