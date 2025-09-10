import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from './SessionManager';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Create a new SessionManager instance with mock dependencies that match the SessionManagerDependencies interface
    sessionManager = new SessionManager({
      personaManager: {} as any,
      textSessionManager: {} as any,
      callSessionManager: {} as any,
      energyBarService: {} as any,
      hostElement: {} as any,
      handleCallRateLimit: () => {},
      clearThinkingAll: () => {},
      queryShadowRoot: () => null,
    });
  });

  describe('VPU payload construction', () => {
    it('should construct VPU payload with only user input when advisor context is "none"', () => {
      const advisorContext = 'none';
      const userInput = 'Hello, how are you?';
      const payload = sessionManager.constructVpuMessagePayload(advisorContext, userInput);
      
      // When advisor_context is "none", payload should only contain user input
      expect(payload).toEqual(userInput);
    });

    it('should construct VPU payload with both advisor context and user input when advisor context has content', () => {
      const advisorContext = 'USER_EMOTION: curiosity (confidence=0.74)\nMODEL_EMOTION: neutral (confidence=0.65)\nADVISOR_CONTEXT:\n\n• user likes concise step-by-step explanations\n• user previously struggled with audio device setup';
      const userInput = 'What about tomorrow?';
      const payload = sessionManager.constructVpuMessagePayload(advisorContext, userInput);
      
      // When advisor_context has content, payload should be formatted as: advisor_context + \n\n + user_input
      expect(payload).toEqual(`${advisorContext}\n\n${userInput}`);
    });
  });
});
