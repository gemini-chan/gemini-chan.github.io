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
	hostElement: HTMLElement;

	handleCallRateLimit: () => void;
	clearThinkingAll: () => void;
	queryShadowRoot: (selector: string) => HTMLElement | null;
}

export class SessionManager {
	private deps: SessionManagerDependencies;

	public textSession: Session | null = null;
	public callSession: Session | null = null;
	public lastAnalyzedTranscriptIndex: number = 0;
	public textTranscript: Turn[] = [];
	public callTranscript: Turn[] = [];
	public messageStatuses: Record<string, 'clock' | 'single' | 'double' | 'error'> = {};
	public messageRetryCount: Record<string, number> = {};
	public _callReconnectingNotified: boolean = false;
	public _callRateLimitNotified: boolean = false;

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
  	this.deps.hostElement.dispatchEvent(new CustomEvent('status-update', { detail: { message: "Initializing text session..." }, bubbles: true, composed: true }));
  	const ok = await this.deps.textSessionManager.initSession();
  	this.textSession = this.deps.textSessionManager.sessionInstance;
  	if (!ok || !this.deps.textSessionManager.sessionInstance) {
  		this.deps.hostElement.dispatchEvent(new CustomEvent('error-update', { detail: { message: "Unable to start text session (rate limited or network error)" }, bubbles: true, composed: true }));
  		return false;
  	}
  }
  return true;
 }

 public async initCallSession() {
  this.deps.hostElement.dispatchEvent(new CustomEvent('status-update', { detail: { message: "Initializing call session..." }, bubbles: true, composed: true }));
  const ok = await this.deps.callSessionManager.initSession();
  this.callSession = this.deps.callSessionManager.sessionInstance;

  if (!ok || !this.deps.callSessionManager.sessionInstance) {
  	// If energy is exhausted, reflect a different UX than rate limit
  	const exhausted =
  		this.deps.energyBarService.getCurrentEnergyLevel() === 0;
  	if (exhausted) {
  		this.deps.hostElement.dispatchEvent(new CustomEvent('status-update', { detail: { message: "Energy exhausted — please try again later." }, bubbles: true, composed: true }));
  	} else {
  		this.deps.handleCallRateLimit();
  		this.deps.hostElement.dispatchEvent(new CustomEvent('status-update', { detail: { message: "Unable to start call (rate limited or network error)" }, bubbles: true, composed: true }));
  	}
  	return false;
  }
  return true;
 }

 public resetTextContext() {
  // Reset the delta-analysis index for text transcript
  this.lastAnalyzedTranscriptIndex = 0;
  this.textTranscript = [];
  this.textSession = null;

  // Close existing text session using session manager
  if (this.deps.textSessionManager) {
  	this.deps.textSessionManager.closeSession();
  }

  // Clear thinking UI and timers
  this.deps.clearThinkingAll();

  // Text session will be lazily initialized when user sends next message
  this.deps.hostElement.dispatchEvent(new CustomEvent('status-update', { detail: { message: "Text conversation cleared." }, bubbles: true, composed: true }));
 }

 public resetCallContext() {
  // Reset the delta-analysis index for call transcript
  this.lastAnalyzedTranscriptIndex = 0;
  // Also clear the persisted resumption handle so the next call starts fresh
  try {
  	this.deps.callSessionManager?.clearResumptionHandle();
  } catch (e) {
  	logger.warn("Failed to clear call session resumption handle:", e);
  }
  // Reset reconnection toast guard
  this._callReconnectingNotified = false;

  logger.debug("Resetting call context. Closing session.");
  // Close existing call session using session manager
  if (this.deps.callSessionManager) {
  	this.deps.callSessionManager.closeSession();
  	this.callSession = null;
  }

  // Clear call transcript and reset rate-limit states
  this.callTranscript = [];
  this._callRateLimitNotified = false;

  const callT = this.deps.queryShadowRoot("call-transcript") as HTMLElement & {
  	rateLimited?: boolean;
  };
  if (callT) {
  	callT.rateLimited = false;
  }

  // Clear thinking UI and timers
  this.deps.clearThinkingAll();

  // Reinitialize call session if we're currently in a call
  // Note: We'll need to handle isCallActive state differently in the next step
  this.deps.hostElement.dispatchEvent(new CustomEvent('status-update', { detail: { message: "Call conversation cleared." }, bubbles: true, composed: true }));
  // Reuse the existing call-start toasts when the next call starts (resume-first flow).
  // No additional toast here to avoid redundancy.
 }
}
