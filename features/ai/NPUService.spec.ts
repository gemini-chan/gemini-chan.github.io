import { describe, it, expect, vi } from 'vitest';
import { NPUService } from '@features/ai/NPUService';
import type { AIClient } from './BaseAIService';
import type { IMemoryService } from '@features/memory/MemoryService';

// Minimal AI client mock
const mockAIClient: AIClient = {
  models: {
    generateContent: async () => ({ text: '' }),
  },
};

// Minimal memory service mock
const mockMemoryService: IMemoryService = {
  retrieveRelevantMemories: vi.fn(async () => []),
  getLastModelEmotion: vi.fn(() => 'neutral'),
  getAllMemories: vi.fn(async () => []),
  deleteMemory: vi.fn(async () => {}),
  deleteAllMemories: vi.fn(async () => {}),
  extractAndStoreFacts: vi.fn(async () => {}),
  applyTimeDecay: vi.fn(async () => {}),
  pinMemory: vi.fn(async () => {}),
  unpinMemory: vi.fn(async () => {}),
};

function makeService() {
  return new NPUService(mockAIClient, mockMemoryService);
}

describe('NPUService.buildRecentTurnsContext', () => {
  it('returns empty string for empty transcript', () => {
    const svc = makeService();
    const res = (svc as unknown as { [key: string]: (arg1: unknown[], arg2: number) => string }).buildRecentTurnsContext([], 10);
    expect(res).toEqual('');
  });

  it('preserves chronological order and slices last N', () => {
    const svc = makeService();
    const transcript = [
      { speaker: 'user', text: 'u1' },
      { speaker: 'model', text: 'm1' },
      { speaker: 'user', text: 'u2' },
      { speaker: 'model', text: 'm2' },
    ];
    const res = (svc as unknown as { [key: string]: (arg1: unknown[], arg2: number) => string }).buildRecentTurnsContext(transcript, 3);
    expect(res).toEqual(
      'RECENT CONVERSATION TURNS:\n- MODEL: m1\n- USER: u2\n- MODEL: m2'
    );
  });

  it('returns all turns when N exceeds transcript length', () => {
    const svc = makeService();
    const transcript = [
      { speaker: 'user', text: 'u1' },
      { speaker: 'model', text: 'm1' },
      { speaker: 'user', text: 'u2' },
      { speaker: 'model', text: 'm2' },
    ];
    const res = (svc as unknown as { [key: string]: (arg1: unknown[], arg2: number) => string }).buildRecentTurnsContext(transcript, 10);
    expect(res).toEqual(
      'RECENT CONVERSATION TURNS:\n- USER: u1\n- MODEL: m1\n- USER: u2\n- MODEL: m2'
    );
  });
});
