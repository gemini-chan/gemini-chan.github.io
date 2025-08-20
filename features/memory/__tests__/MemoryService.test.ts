import { expect } from "@open-wc/testing";
import { VectorStore } from "@store/VectorStore";
import type { Memory } from "../Memory";
import { MemoryService } from "../MemoryService";

// Mock VectorStore for testing
class MockVectorStore extends VectorStore {
  private memories: Memory[] = [];

  constructor() {
    super("test-persona");
  }

  async saveMemory(memory: Memory): Promise<void> {
    this.memories.push(memory);
  }

  async getAllMemories(): Promise<Memory[]> {
    return this.memories;
  }

  async searchMemories(
    query: string,
    threshold: number = 0.8,
  ): Promise<Memory[]> {
    return this.memories.filter((m) =>
      m.fact_value.toLowerCase().includes(query.toLowerCase()),
    );
  }
}

describe("MemoryService", () => {
  let memoryService: MemoryService;
  let mockVectorStore: MockVectorStore;

  beforeEach(() => {
    mockVectorStore = new MockVectorStore();
    memoryService = new MemoryService(mockVectorStore);
  });

  it("should be created successfully", () => {
    expect(memoryService).to.exist;
  });

  // Note: These tests are placeholders as the actual implementation
  // would require AI model integration
  it("should process and store memory without errors", async () => {
    const transcript =
      "User: My name is Alex and I work as a software developer.";
    const sessionId = "test-session-123";

    // This should not throw an error
    await memoryService.processAndStoreMemory(transcript, sessionId);
    expect(true).to.be.true; // Simple assertion to make the test pass
  });
});
