import { expect } from "@open-wc/testing";
import type { Turn } from "@shared/types";
import { SummarizationService } from "../SummarizationService";

// Mock AI Client
const mockAIClient = {
  models: {
    generateContent: async () => ({
      text: "This is a summary of the conversation.",
    }),
  },
} as any;

describe("SummarizationService", () => {
  let summarizationService: SummarizationService;

  beforeEach(() => {
    summarizationService = new SummarizationService(mockAIClient);
  });

  it("should be created successfully", () => {
    expect(summarizationService).to.exist;
  });

  it("should summarize a transcript", async () => {
    const transcript: Turn[] = [
      { speaker: "user", text: "Hello" },
      { speaker: "model", text: "Hi there!" },
    ];

    const summary = await summarizationService.summarize(transcript);
    expect(summary).to.equal("This is a summary of the conversation.");
  });

  it("should return empty string for empty transcript", async () => {
    const summary = await summarizationService.summarize([]);
    expect(summary).to.equal("");
  });
});
