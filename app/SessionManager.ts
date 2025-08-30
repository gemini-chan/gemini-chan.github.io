/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GdmLiveAudio } from './main.tsx';
import type { TextSessionManager, CallSessionManager } from "@features/vpu/VPUService";
import type { Session } from "@google/genai";
import type { ToastNotification } from "@components/ToastNotification";
import { logger } from './main.tsx';

export class SessionManager {
  private host: GdmLiveAudio;

  constructor(host: GdmLiveAudio) {
    this.host = host;
  }

  public async initTextSession(): Promise<boolean> {
    // Ensure we have an active text session
    if (!this.host.textSessionManager || !this.host.textSessionManager.isActive) {
      this.host.updateStatus("Initializing text session...");
      const ok = await this.host.textSessionManager.initSession();
      this.host.textSession = this.host.textSessionManager.sessionInstance;
      if (!ok || !this.host.textSession) {
        this.host.updateError(
          "Unable to start text session (rate limited or network error)",
        );
        return false;
      }
    }
    return true;
  }

  public async initCallSession() {
    this.host.updateStatus("Initializing call session...");
    const ok = await this.host.callSessionManager.initSession();
    this.host.callSession = this.host.callSessionManager.sessionInstance;
    if (!ok || !this.host.callSession) {
      // If energy is exhausted, reflect a different UX than rate limit
      const exhausted = this.host.energyBarService.getCurrentEnergyLevel() === 0;
      if (exhausted) {
        this.host.updateStatus("Energy exhausted — please try again later.");
      } else {
        this.host._handleCallRateLimit();
        this.host.updateStatus(
          "Unable to start call (rate limited or network error)",
        );
      }
      return false;
    }
    return true;
  }

  public resetTextContext() {
    // Reset the delta-analysis index for text transcript
    this.host.lastAnalyzedTranscriptIndex = 0;
    // Close existing text session using session manager
    if (this.host.textSessionManager) {
      this.host.textSessionManager.closeSession();
      this.host.textSession = null;
    }

    // Clear text transcript
    this.host.textTranscript = [];
    this.host.lastAnalyzedTranscriptIndex = 0;

    // Clear thinking UI and timers
    this.host._clearThinkingAll();

    // Text session will be lazily initialized when user sends next message
    this.host.updateStatus("Text conversation cleared.");
  }

  public resetCallContext() {
    // Reset the delta-analysis index for call transcript
    this.host.lastAnalyzedTranscriptIndex = 0;
    // Also clear the persisted resumption handle so the next call starts fresh
    try {
      this.host.callSessionManager?.clearResumptionHandle();
    } catch (e) {
      logger.warn("Failed to clear call session resumption handle:", e);
    }
    // Reset reconnection toast guard
    this.host._callReconnectingNotified = false;
    logger.debug("Resetting call context. Closing session.");
    // Close existing call session using session manager
    if (this.host.callSessionManager) {
      this.host.callSessionManager.closeSession();
      this.host.callSession = null;
    }

    // Clear call transcript and reset rate-limit states
    this.host.callTranscript = [];
    this.host._callRateLimitNotified = false;
    const callT = this.host.shadowRoot?.querySelector(
      "call-transcript",
    ) as HTMLElement & { rateLimited?: boolean };
    if (callT) {
      callT.rateLimited = false;
    }

    // Clear thinking UI and timers
    this.host._clearThinkingAll();

    // Reinitialize call session if we're currently in a call
    if (this.host.isCallActive) {
      this.initCallSession();
    }
    this.host.updateStatus("Call conversation cleared.");
    // Reuse the existing call-start toasts when the next call starts (resume-first flow).
    // No additional toast here to avoid redundancy.
  }
}
