import { describe, it, expect } from 'vitest';
import { NPUService } from '@features/ai/NPUService';

// Minimal AI client mock
const mockAIClient = {
  models: {
    generateContent: async () => ({ text: '' })
  }
};

// Minimal memory service mock
const mockMemoryService: any = {};

function makeService() {
  return new NPUService(mockAIClient as any, mockMemoryService as any);
}

describe('NPUService.buildRecentTurnsContext', () => {
  it('returns empty string for empty transcript', () => {
    const svc = makeService();
    const res = (svc as any).buildRecentTurnsContext([], 10);
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
    const res = (svc as any).buildRecentTurnsContext(transcript, 3);
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
    const res = (svc as any).buildRecentTurnsContext(transcript, 10);
    expect(res).toEqual(
      'RECENT CONVERSATION TURNS:\n- USER: u1\n- MODEL: m1\n- USER: u2\n- MODEL: m2'
    );
  });
});
