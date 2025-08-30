/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from "./main.tsx";
import combinedPrompt from "@prompts/npu/combined-npu.prompt.md?raw";
import type { CallSessionManager, TextSessionManager } from "@features/vpu/VPUService";
import type { PersonaManager } from "@features/persona/PersonaManager";
import type { EnergyBarService } from "@services/EnergyBarService";
import type { Session } from "@google/genai";
import type { Turn } from "@shared/types";

export interface SessionManagerDependencies {
	personaManager: PersonaManager;
	textSessionManager: TextSessionManager;
	callSessionManager: CallSessionManager;
	energyBarService: EnergyBarService;

	getState: () => {
		isCallActive: boolean;
		lastAnalyzedTranscriptIndex: number;
		textTranscript: Turn[];
		callTranscript: Turn[];
		_callReconnectingNotified: boolean;
		_callRateLimitNotified: boolean;
	};

	setState: (
		newState: Partial<{
			textSession: Session | null;
			callSession: Session | null;
			lastAnalyzedTranscriptIndex: number;
			textTranscript: Turn[];
			callTranscript: Turn[];
			_callReconnectingNotified: boolean;
			_callRateLimitNotified: boolean;
		}>,
	) => void;

	updateStatus: (msg: string) => void;
	updateError: (msg: string) => void;
	handleCallRateLimit: () => void;
	clearThinkingAll: () => void;
	queryShadowRoot: (selector: string) => HTMLElement | null;
}

export class SessionManager {
	private deps: SessionManagerDependencies;

	constructor(deps: SessionManagerDependencies) {
		this.deps = deps;
	}

 private _buildVpuPrompt(
  userMessage: string,
  memoryContext: string,
  systemPrompt: string,
 ): string {
  const ctxBlocks: string[] = [];
  if (memoryContext?.trim()) {
  	ctxBlocks.push(
  		`RELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS:\n${memoryContext}`,
  	);
  }

  const contextSection = ctxBlocks.length
  	? `\n\n${ctxBlocks.join("\n\n")}`
  	: "";

  // Use the combined markdown prompt template
  return combinedPrompt
  	.replace("{systemPrompt}", systemPrompt)
  	.replace("{context}", contextSection)
  	.replace("{userMessage}", userMessage);
 }

 public constructVpuMessagePayload(
  advisor_context: string,
  user_input: string,
 ): string {
  const persona = this.deps.personaManager.getActivePersona();
  const systemPrompt = persona.systemPrompt;

  // Use the new private method to build the combined prompt string
  return this._buildVpuPrompt(
  	user_input,
  	advisor_context,
  	systemPrompt,
  );
 }

 public async initTextSession(): Promise<boolean> {
  // Ensure we have an active text session
  if (
  	!this.deps.textSessionManager ||
  	!this.deps.textSessionManager.isActive
  ) {
  	this.deps.updateStatus("Initializing text session...");
  	const ok = await this.deps.textSessionManager.initSession();
  	this.deps.setState({
  		textSession: this.deps.textSessionManager.sessionInstance,
  	});
  	if (!ok || !this.deps.textSessionManager.sessionInstance) {
  		this.deps.updateError(
  			"Unable to start text session (rate limited or network error)",
  		);
  		return false;
  	}
  }
  return true;
 }

 public async initCallSession() {
  this.deps.updateStatus("Initializing call session...");
  const ok = await this.deps.callSessionManager.initSession();
  this.deps.setState({
  	callSession: this.deps.callSessionManager.sessionInstance,
  });

  if (!ok || !this.deps.callSessionManager.sessionInstance) {
  	// If energy is exhausted, reflect a different UX than rate limit
  	const exhausted =
  		this.deps.energyBarService.getCurrentEnergyLevel() === 0;
  	if (exhausted) {
  		this.deps.updateStatus(
  			"Energy exhausted — please try again later.",
  		);
  	} else {
  		this.deps.handleCallRateLimit();
  		this.deps.updateStatus(
  			"Unable to start call (rate limited or network error)",
  		);
  	}
  	return false;
  }
  return true;
 }

 public resetTextContext() {
  // Reset the delta-analysis index for text transcript
  this.deps.setState({
  	lastAnalyzedTranscriptIndex: 0,
  	textTranscript: [],
  	textSession: null,
  });

  // Close existing text session using session manager
  if (this.deps.textSessionManager) {
  	this.deps.textSessionManager.closeSession();
  }

  // Clear thinking UI and timers
  this.deps.clearThinkingAll();

  // Text session will be lazily initialized when user sends next message
  this.deps.updateStatus("Text conversation cleared.");
 }

 public resetCallContext() {
  // Reset the delta-analysis index for call transcript
  this.deps.setState({ lastAnalyzedTranscriptIndex: 0 });
  // Also clear the persisted resumption handle so the next call starts fresh
  try {
  	this.deps.callSessionManager?.clearResumptionHandle();
  } catch (e) {
  	logger.warn("Failed to clear call session resumption handle:", e);
  }
  // Reset reconnection toast guard
  this.deps.setState({ _callReconnectingNotified: false });

  logger.debug("Resetting call context. Closing session.");
  // Close existing call session using session manager
  if (this.deps.callSessionManager) {
  	this.deps.callSessionManager.closeSession();
  	this.deps.setState({ callSession: null });
  }

  // Clear call transcript and reset rate-limit states
  this.deps.setState({
  	callTranscript: [],
  	_callRateLimitNotified: false,
  });

  const callT = this.deps.queryShadowRoot("call-transcript") as HTMLElement & {
  	rateLimited?: boolean;
  };
  if (callT) {
  	callT.rateLimited = false;
  }

  // Clear thinking UI and timers
  this.deps.clearThinkingAll();

  // Reinitialize call session if we're currently in a call
  if (this.deps.getState().isCallActive) {
  	this.initCallSession();
  }
  this.deps.updateStatus("Call conversation cleared.");
  // Reuse the existing call-start toasts when the next call starts (resume-first flow).
  // No additional toast here to avoid redundancy.
 }
}
