import { SessionManager } from './SessionManager';

describe('SessionManager', () => {
  describe('VPU payload construction', () => {
    it('should construct VPU payload with only user input when advisor context is "none"', () => {
      const sessionManager = new SessionManager();
      
      // Mock the getAdvisorContext to return "none"
      jest.spyOn(sessionManager as any, 'getAdvisorContext').mockReturnValue('none');
      
      const userInput = 'Hello, how are you?';
      const payload = (sessionManager as any).constructVPUPayload(userInput);
      
      // When advisor_context is "none", payload should only contain user input
      expect(payload).toEqual(userInput);
    });

    it('should construct VPU payload with both advisor context and user input when advisor context has content', () => {
      const sessionManager = new SessionManager();
      
      // Mock the getAdvisorContext to return actual content
      const advisorContext = 'Previous conversation about weather';
      jest.spyOn(sessionManager as any, 'getAdvisorContext').mockReturnValue(advisorContext);
      
      const userInput = 'What about tomorrow?';
      const payload = (sessionManager as any).constructVPUPayload(userInput);
      
      // When advisor_context has content, payload should contain both context and user input
      expect(payload).toContain(advisorContext);
      expect(payload).toContain(userInput);
    });
  });
});
