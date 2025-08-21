import { expect } from "@open-wc/testing";
import { BaseAIService } from "../BaseAIService";

// Mock AI Client
const mockAIClient = {
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
}

describe("BaseAIService", () => {
  let testService: TestAIService;

  beforeEach(() => {
    testService = new TestAIService(mockAIClient);
  });

  it("should be created successfully", () => {
    expect(testService).to.exist;
  });

  it("should call AI model and return response", async () => {
    const result = await testService.process("Test prompt");
    expect(result).to.equal("Mock response");
  });

  it("should parse JSON response correctly", () => {
    const jsonText = '{"key": "value"}';
    const result = testService["parseJsonResponse"](jsonText);
    expect(result).to.deep.equal({ key: "value" });
  });

  it("should handle invalid JSON gracefully", () => {
    const invalidJson = '{"key": "value"';
    const result = testService["parseJsonResponse"](invalidJson);
    expect(result).to.be.null;
  });
});
