import { expect } from "@open-wc/testing";
import { BaseAIService } from "../BaseAIService";

// Mock AI Client with embedding support
const mockAIClient = {
  models: {
    generateContent: async () => ({
      text: "Mock response",
    }),
    embedContent: async () => ({
      embedding: { values: [0.1, 0.2, 0.3, 0.4, 0.5] },
      embeddings: [{ values: [0.1, 0.2, 0.3, 0.4, 0.5] }],
    }),
  },
} as any;

// Mock AI Client without embedding support
const mockBasicAIClient = {
  models: {
    generateContent: async () => ({
      text: "Mock response",
    }),
  },
} as any;

class TestAIService extends BaseAIService {
  async process(input: string): Promise<string> {
    return await this.callAIModel(input);
  }

  async createEmbedding(text: string): Promise<number[]> {
    return await this.generateEmbedding(text);
  }
}

describe("BaseAIService - Embeddings", () => {
  let testServiceWithEmbeddings: TestAIService;
  let testServiceWithoutEmbeddings: TestAIService;

  beforeEach(() => {
    testServiceWithEmbeddings = new TestAIService(mockAIClient);
    testServiceWithoutEmbeddings = new TestAIService(mockBasicAIClient);
  });

  it("should be created successfully", () => {
    expect(testServiceWithEmbeddings).to.exist;
    expect(testServiceWithoutEmbeddings).to.exist;
  });

  it("should generate embeddings when client supports embeddings", async () => {
    const embedding =
      await testServiceWithEmbeddings.createEmbedding("Test text");
    expect(embedding).to.deep.equal([0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it("should return fallback embedding when client does not support embeddings", async () => {
    const embedding =
      await testServiceWithoutEmbeddings.createEmbedding("Test text");
    expect(embedding).to.have.lengthOf(768);
    expect(embedding.every((v) => v === 0)).to.be.true;
  });
});
