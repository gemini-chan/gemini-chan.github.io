import { SessionManager } from './SessionManager';

// Mock dependencies
const mockVpuService = {
  sendMessage: jest.fn(),
};

const mockMemoryService = {
  searchMemories: jest.fn(),
  storeMemory: jest.fn(),
};

const mockConfig = {
  vpu: {
    endpoint: 'test-endpoint',
  },
};

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Create a new SessionManager instance with mock dependencies
    sessionManager = new SessionManager({
      vpuService: mockVpuService as any,
      memoryService: mockMemoryService as any,
      config: mockConfig as any
    });
    
    // Clear mock calls between tests
    jest.clearAllMocks();
  });

  describe('VPU payload construction', () => {
    it('should construct VPU payload with only user input when advisor context is "none"', () => {
      const userInput = 'Hello, how are you?';
      const payload = (sessionManager as any).constructVpuMessagePayload('none', userInput);
      
      // When advisor_context is "none", payload should only contain user input
      expect(payload).toEqual(userInput);
    });

    it('should construct VPU payload with both advisor context and user input when advisor context has content', () => {
      const advisorContext = 'Previous conversation about weather';
      const userInput = 'What about tomorrow?';
      const payload = (sessionManager as any).constructVpuMessagePayload(advisorContext, userInput);
      
      // When advisor_context has content, payload should contain both context and user input
      expect(payload).toContain(advisorContext);
      expect(payload).toContain(userInput);
    });
  });
});
