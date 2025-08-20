import { expect } from '@open-wc/testing';
import { NPUService } from '../NPUService';
import { MemoryService } from '@features/memory/MemoryService';
import type { AIClient } from '../BaseAIService';

// Mock AI Client
const mockAIClient: AIClient = {
  models: {
    generateContent: async () => ({
      response: {
        text: "Enhanced prompt: What is your favorite hiking trail?",
      },
    }),
  },
};

// Mock Memory Service
const mockMemoryService = {
  retrieveRelevantMemories: async () => [
    {
      id: 1,
      fact_key: 'user_hobby',
      fact_value: 'hiking',
      confidence_score: 0.9,
      permanence_score: 'permanent',
      timestamp: new Date(),
      conversation_turn: 'I love hiking',
      personaId: 'test-persona',
    },
  ],
};

describe('NPU-VPU Integration', () => {
  let npuService: NPUService;

  beforeEach(() => {
    npuService = new NPUService(mockAIClient as any, mockMemoryService as any);
  });

  it('should preserve original message and add memory context', async () => {
    const userMessage = "What is your favorite hiking trail?";
    const personaId = "test-persona";

    const result = await npuService.createRAGPrompt(userMessage, personaId);

    expect(result).to.have.property('enhancedPrompt');
    expect(result).to.have.property('retrievedMemories');
    expect(result).to.have.property('memoryContext');
    expect(result.retrievedMemories).to.have.lengthOf(1);
    expect(result.memoryContext).to.include('hiking');
    expect(result.enhancedPrompt).to.include(userMessage); // Original message preserved
    expect(result.enhancedPrompt).to.include('RELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS');
  });

  it('should handle cases with no relevant memories', async () => {
    const mockEmptyMemoryService = {
      retrieveRelevantMemories: async () => [],
    };

    const emptyNpuService = new NPUService(mockAIClient as any, mockEmptyMemoryService as any);

    const userMessage = "What is the weather today?";
    const personaId = "test-persona";

    const result = await emptyNpuService.createRAGPrompt(userMessage, personaId);

    expect(result.retrievedMemories).to.have.lengthOf(0);
    expect(result.memoryContext).to.equal('');
    expect(result.enhancedPrompt).to.be.a('string');
  });

  it('should gracefully handle NPU failures', async () => {
    const mockFailingAIClient: AIClient = {
      models: {
        generateContent: async () => {
          throw new Error('NPU API Error');
        },
      },
    };

    const failingNpuService = new NPUService(mockFailingAIClient as any, mockMemoryService as any);

    const userMessage = "What is your favorite hiking trail?";
    const personaId = "test-persona";

    const result = await failingNpuService.createRAGPrompt(userMessage, personaId);

    // Should fall back to original message on NPU failure
    expect(result.enhancedPrompt).to.equal(userMessage);
    expect(result.retrievedMemories).to.have.lengthOf(1);
  });
});