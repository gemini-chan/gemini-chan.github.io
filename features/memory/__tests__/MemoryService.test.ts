import type { AIClient } from "@features/ai/BaseAIService";
import { expect } from "@open-wc/testing";
import type { VectorStore } from "@store/VectorStore";
import sinon from "sinon";
import type { Memory } from "../Memory";
import { MemoryService } from "../MemoryService";

// A more robust Mock VectorStore for detailed testing
class MockVectorStore {
  public memories: Memory[] = [];
  saveMemory = sinon.stub().callsFake(async (memory: Memory): Promise<void> => {
    this.memories.push(memory);
  });
  searchMemories = sinon.stub().resolves([]);
  // Add other methods if needed, though they aren't used by MemoryService directly
  init = sinon.stub().resolves();
  switchPersona = sinon.stub().resolves();
  setAIClient = sinon.stub();
  getAllMemories = sinon.stub().callsFake(async (): Promise<Memory[]> => {
    return this.memories;
  });
}

// Mock AI Client with more control
const mockGenerateContent = sinon.stub();
const mockAIClient = {
  models: {
    generateContent: mockGenerateContent,
  },
} as unknown as AIClient;

describe("MemoryService", () => {
  let memoryService: MemoryService;
  let mockVectorStore: MockVectorStore;

  beforeEach(() => {
    mockVectorStore = new MockVectorStore();
    // Reset stubs before each test
    mockGenerateContent.reset();
    memoryService = new MemoryService(
      mockVectorStore as unknown as VectorStore,
      mockAIClient,
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("processAndStoreMemory", () => {
    it("should extract facts and store them in the vector store", async () => {
      const transcript = "User: My name is Gemini and I love coding.";
      const sessionId = "test-session-1";
      const mockFacts = [
        {
          fact_key: "user_name",
          fact_value: "Gemini",
          confidence_score: 0.98,
          permanence_score: "permanent",
        },
        {
          fact_key: "user_hobby",
          fact_value: "coding",
          confidence_score: 0.95,
          permanence_score: "contextual",
        },
      ];
      mockGenerateContent.resolves({
        text: JSON.stringify(mockFacts),
      });

      await memoryService.processAndStoreMemory(transcript, sessionId);

      // Verify AI was called
      expect(mockGenerateContent.calledOnce).to.be.true;

      // Verify facts were saved
      expect(mockVectorStore.saveMemory.callCount).to.equal(2);
      const firstCallArgs = mockVectorStore.saveMemory.getCall(0).args[0];
      expect(firstCallArgs.fact_key).to.equal("user_name");
      expect(firstCallArgs.fact_value).to.equal("Gemini");
      expect(firstCallArgs.personaId).to.equal(sessionId);
    });

    it("should handle invalid JSON responses gracefully", async () => {
      const transcript = "User: Some random chatter.";
      const sessionId = "test-session-2";
      mockGenerateContent.resolves({ text: "this is not json" });

      await memoryService.processAndStoreMemory(transcript, sessionId);

      expect(mockVectorStore.saveMemory.called).to.be.false;
    });

    it("should filter out malformed facts before storing", async () => {
      const transcript = "User: Data with issues.";
      const sessionId = "test-session-3";
      const mockFacts = [
        {
          fact_key: "valid_fact",
          fact_value: "This is okay",
          confidence_score: 0.9,
          permanence_score: "permanent",
        },
        { fact_key: "missing_value", confidence_score: 0.8 }, // Missing fact_value
      ];
      mockGenerateContent.resolves({
        text: JSON.stringify(mockFacts),
      });

      await memoryService.processAndStoreMemory(transcript, sessionId);

      expect(mockVectorStore.saveMemory.callCount).to.equal(1);
      expect(mockVectorStore.saveMemory.getCall(0).args[0].fact_key).to.equal(
        "valid_fact",
      );
    });

    it("should not store anything if AI returns no facts", async () => {
      const transcript = "User: Nothing important here.";
      const sessionId = "test-session-4";
      mockGenerateContent.resolves({ text: JSON.stringify([]) });

      await memoryService.processAndStoreMemory(transcript, sessionId);

      expect(mockVectorStore.saveMemory.called).to.be.false;
    });
  });

  describe("retrieveRelevantMemories", () => {
    let clock;

    afterEach(() => {
      if (clock) {
        clock.restore();
      }
    });

    it("should call vector store and return relevant memories", async () => {
      const query = "What is my name?";
      const sessionId = "test-session-5";
      const mockMemories = [
        {
          fact_key: "user_name",
          fact_value: "Gemini",
          vector: [1, 2, 3],
        },
      ];
      mockVectorStore.searchMemories.resolves(mockMemories as Memory[]);

      const results = await memoryService.retrieveRelevantMemories(
        query,
        sessionId,
      );

      expect(mockVectorStore.searchMemories.calledOnceWith(query, 0.7)).to.be
        .true;
      expect(results).to.deep.equal(mockMemories);
    });

    it("should use cache for subsequent identical queries", async () => {
      const query = "What is my hobby?";
      const sessionId = "test-session-6";
      mockVectorStore.searchMemories.resolves([
        { fact_key: "hobby", fact_value: "coding" } as Memory,
      ]);

      // First call
      await memoryService.retrieveRelevantMemories(query, sessionId);
      expect(mockVectorStore.searchMemories.callCount).to.equal(1);

      // Second call immediately after
      await memoryService.retrieveRelevantMemories(query, sessionId);
      expect(mockVectorStore.searchMemories.callCount).to.equal(
        1,
        "Should not call search again",
      );
    });

    it("should not use cache if query is different", async () => {
      const query1 = "What is my hobby?";
      const query2 = "What is my name?";
      const sessionId = "test-session-7";
      mockVectorStore.searchMemories.resolves([]);

      await memoryService.retrieveRelevantMemories(query1, sessionId);
      await memoryService.retrieveRelevantMemories(query2, sessionId);

      expect(mockVectorStore.searchMemories.callCount).to.equal(2);
    });
  });
});
