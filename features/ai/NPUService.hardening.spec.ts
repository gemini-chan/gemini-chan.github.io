import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NPUService } from '@features/ai/NPUService'
import {
  NPU_DEFAULTS,
  NPU_STORAGE_KEYS,
  NPU_THINKING_TOKENS,
  NPU_LIMITS,
} from '@shared/constants'
import type {
  AIClient,
  GenerateContentRequest,
} from '@features/ai/BaseAIService'
import type { IMemoryService } from '@features/memory/MemoryService'
import type { Turn } from '@shared/types'

function mkAIClient(
  handler?: (req: GenerateContentRequest) => Promise<{ text: string }>
): AIClient {
  return {
    models: {
      generateContent: vi.fn(handler || (async () => ({ text: 'ok' }))),
    },
  } as unknown as AIClient
}

function mkMemoryService(opts?: {
  throw?: boolean
  memories?: unknown[]
}): IMemoryService {
  return {
    retrieveRelevantMemories: vi.fn(async () => {
      if (opts?.throw) throw new Error('boom')
      return (
        opts?.memories || [
          {
            fact_key: 'name',
            fact_value: 'Airi',
            confidence_score: 0.9,
            permanence_score: 'permanent',
            timestamp: new Date(),
            conversation_turn: 't1',
            personaId: 'p1',
          },
          {
            fact_key: 'likes',
            fact_value: 'ramen',
            confidence_score: 0.8,
            permanence_score: 'contextual',
            timestamp: new Date(),
            conversation_turn: 't2',
            personaId: 'p1',
          },
        ]
      )
    }),
  } as unknown as IMemoryService
}

const transcript: Turn[] = [
  { speaker: 'user', text: 'hello' },
  { speaker: 'model', text: 'hi' },
]

describe('NPUService hardening', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('clamps temperature, topP, topK and recentTurns from localStorage', async () => {
    localStorage.setItem(NPU_STORAGE_KEYS.temperature, '1.5') // clamp to 1
    localStorage.setItem(NPU_STORAGE_KEYS.topP, '-0.1') // clamp to 0
    localStorage.setItem(NPU_STORAGE_KEYS.topK, '999') // clamp to 100
    localStorage.setItem(NPU_STORAGE_KEYS.recentTurns, '-10') // clamp to min 2
    localStorage.setItem(NPU_STORAGE_KEYS.thinkingLevel, 'lite')

    const ai = mkAIClient(async () => ({ text: 'advice' }))
    const mem = mkMemoryService()
    const svc = new NPUService(ai, mem)

    const payload = await svc.analyzeAndAdvise('Hi', 'p1', transcript)
    expect(payload.advisor_context).toBe('advice')

    const calls = (
      ai.models.generateContent as unknown as {
        mock: { calls: GenerateContentRequest[][] }
      }
    ).mock.calls
    const call = calls[0]![0]!
    expect(call.generationConfig.temperature).toBeCloseTo(1, 6)
    expect(call.generationConfig.topP).toBeCloseTo(0, 6)
    expect(call.generationConfig.topK).toBe(NPU_LIMITS.topK.max)
  })

  it('falls back to defaults on invalid localStorage values and uses thinking tokens', async () => {
    localStorage.setItem(NPU_STORAGE_KEYS.temperature, 'abc')
    localStorage.setItem(NPU_STORAGE_KEYS.topP, 'NaN')
    localStorage.setItem(NPU_STORAGE_KEYS.topK, 'str')
    localStorage.setItem(NPU_STORAGE_KEYS.thinkingLevel, 'invalid') // should default to standard

    const ai = mkAIClient(async () => ({ text: 'advice' }))
    const mem = mkMemoryService()
    const svc = new NPUService(ai, mem)

    const payload = await svc.analyzeAndAdvise('Hi', 'p1', transcript)
    expect(payload.advisor_context).toBe('advice')

    const calls = (
      ai.models.generateContent as unknown as {
        mock: { calls: GenerateContentRequest[][] }
      }
    ).mock.calls
    const call = calls[0]![0]!
    expect(call.generationConfig.temperature).toBeCloseTo(
      NPU_DEFAULTS.temperature,
      6
    )
    expect(call.generationConfig.topP).toBeCloseTo(NPU_DEFAULTS.topP, 6)
    expect(call.generationConfig.topK).toBe(NPU_DEFAULTS.topK)
    // thinkingLevel should default to standard
    expect(call.generationConfig.maxOutputTokens).toBe(
      NPU_THINKING_TOKENS['standard']
    )
  })

  it('retries on empty responses and falls back to memoryContext when all attempts empty', async () => {
    const ai = mkAIClient(async () => ({ text: '   ' })) // always empty
    const mem = mkMemoryService({
      memories: [
        {
          fact_key: 'color',
          fact_value: 'blue',
          confidence_score: 0.7,
          permanence_score: 'contextual',
          timestamp: new Date(),
          conversation_turn: 't3',
          personaId: 'p1',
        },
      ],
    })
    const svc = new NPUService(ai, mem)

    const payload = await svc.analyzeAndAdvise('X', 'p1', transcript)
    expect(payload.advisor_context).toContain('- color: blue')
    // generateContent called up to maxAttempts (3)
    expect(
      (ai.models.generateContent as unknown as { mock: { calls: unknown[] } })
        .mock.calls.length
    ).toBe(3)
  })

  it('continues gracefully when memory retrieval throws', async () => {
    const ai = mkAIClient(async () => ({ text: 'ok' }))
    const mem = mkMemoryService({ throw: true })
    const svc = new NPUService(ai, mem)

    const payload = await svc.analyzeAndAdvise('X', 'p1', transcript)
    expect(payload.advisor_context).toBe('ok')
  })

  it('uses provided conversationContext instead of recent transcript when present', async () => {
    const cap: { prompt?: string } = {}
    const ai = mkAIClient(async (req: GenerateContentRequest) => {
      cap.prompt = req.contents[0]?.parts[0]?.text || ''
      return { text: 'ok' }
    })
    const mem = mkMemoryService()
    const svc = new NPUService(ai, mem)

    const payload = await svc.analyzeAndAdvise(
      'Hello',
      'p1',
      transcript,
      'SPECIAL_CONTEXT'
    )
    expect(payload.advisor_context).toBe('ok')
    expect(cap.prompt).toContain('CURRENT CONVERSATION CONTEXT:')
    expect(cap.prompt).toContain('SPECIAL_CONTEXT')
  })

  it('falls back to memory context when model call times out', async () => {
    const ai = mkAIClient(() => new Promise(() => {})) // never resolves
    const mem = mkMemoryService({
      memories: [
        {
          fact_key: 'color',
          fact_value: 'blue',
          confidence_score: 0.7,
          permanence_score: 'contextual',
          timestamp: new Date(),
          conversation_turn: 't3',
          personaId: 'p1',
        },
      ],
    })
    const svc = new NPUService(ai, mem)

    const promise = svc.analyzeAndAdvise('X', 'p1', transcript)
    await vi.advanceTimersByTimeAsync(26000)
    const payload = await promise
    expect(payload.advisor_context).toContain('- color: blue')
    // generateContent called up to maxAttempts (3)
    expect(
      (ai.models.generateContent as unknown as { mock: { calls: unknown[] } })
        .mock.calls.length
    ).toBe(3)
  })

  it('progress callback exceptions are caught and do not break flow', async () => {
    const ai = mkAIClient(async () => ({ text: 'ok' }))
    const mem = mkMemoryService()
    const svc = new NPUService(ai, mem)

    const progressCb = vi.fn((event: { type: string }) => {
      if (event.type === 'npu:model:error') throw new Error('progress boom')
    })

    const promise = svc.analyzeAndAdvise(
      'X',
      'p1',
      transcript,
      undefined,
      undefined,
      undefined,
      progressCb
    )
    await vi.runAllTimersAsync()
    const payload = await promise
    expect(payload.advisor_context).toBe('ok')
    expect(progressCb).toHaveBeenCalled()
  })

  it('cancels stale turn and exits retry loop', async () => {
    let callIndex = 0
    const ai = mkAIClient(async () => ({
      text: ++callIndex === 1 ? '   ' : 'ok',
    }))
    const mem = mkMemoryService({
      memories: [
        {
          fact_key: 'color',
          fact_value: 'blue',
          confidence_score: 0.7,
          permanence_score: 'contextual',
          timestamp: new Date(),
          conversation_turn: 't3',
          personaId: 'p1',
        },
      ],
    })
    const svc = new NPUService(ai, mem)

    // Start turn A, it will get an empty response and schedule a retry
    const promiseA = svc.analyzeAndAdvise(
      'X',
      'p1',
      transcript,
      undefined,
      undefined,
      'turnA'
    )

    // Immediately start turn B, which becomes the active turn and succeeds
    const payloadB = await svc.analyzeAndAdvise(
      'Y',
      'p1',
      transcript,
      undefined,
      undefined,
      'turnB'
    )
    expect(payloadB.advisor_context).toBe('ok')

    // Advance time to trigger turn A's retry. It should see it's stale and fallback.
    await vi.advanceTimersByTimeAsync(500)
    const payloadA = await promiseA

    expect(payloadA.advisor_context).toContain('- color: blue')
    // call 1: A (empty), call 2: B (ok). A's retry should not call model.
    expect(
      (ai.models.generateContent as unknown as { mock: { calls: unknown[] } })
        .mock.calls.length
    ).toBe(2)
  })

  it('ranks and limits memories: permanent > contextual > temporary; confidence desc', async () => {
    const memories = [
      {
        fact_key: 'temp_low',
        fact_value: 'temp',
        confidence_score: 0.5,
        permanence_score: 'temporary',
        timestamp: new Date(),
        conversation_turn: 't1',
        personaId: 'p1',
      },
      {
        fact_key: 'temp_high',
        fact_value: 'temp',
        confidence_score: 0.9,
        permanence_score: 'temporary',
        timestamp: new Date(),
        conversation_turn: 't2',
        personaId: 'p1',
      },
      {
        fact_key: 'context_low',
        fact_value: 'context',
        confidence_score: 0.4,
        permanence_score: 'contextual',
        timestamp: new Date(),
        conversation_turn: 't3',
        personaId: 'p1',
      },
      {
        fact_key: 'context_high',
        fact_value: 'context',
        confidence_score: 0.8,
        permanence_score: 'contextual',
        timestamp: new Date(),
        conversation_turn: 't4',
        personaId: 'p1',
      },
      {
        fact_key: 'perm_low',
        fact_value: 'perm',
        confidence_score: 0.3,
        permanence_score: 'permanent',
        timestamp: new Date(),
        conversation_turn: 't5',
        personaId: 'p1',
      },
      {
        fact_key: 'perm_high',
        fact_value: 'perm',
        confidence_score: 0.7,
        permanence_score: 'permanent',
        timestamp: new Date(),
        conversation_turn: 't6',
        personaId: 'p1',
      },
    ]
    const ai = mkAIClient(async (req: GenerateContentRequest) => {
      const prompt = req.contents[0]?.parts[0]?.text || ''
      const start = prompt.indexOf(
        'RELEVANT CONTEXT FROM PREVIOUS CONVERSATIONS:'
      )
      const memorySection = prompt.slice(start)
      const lines = memorySection
        .split('\n')
        .filter((l: string) => l.startsWith('- '))
      // expect only top 5 in correct order
      const prefixes = lines.slice(0, 5).map((l: string) => l.split(' (')[0])
      expect(prefixes).toEqual([
        '- perm_high: perm',
        '- perm_low: perm',
        '- context_high: context',
        '- context_low: context',
        '- temp_high: temp',
      ])
      return { text: 'ok' }
    })
    const mem = mkMemoryService({ memories })
    const svc = new NPUService(ai, mem)

    await svc.analyzeAndAdvise('X', 'p1', transcript)
    expect(
      (ai.models.generateContent as unknown as { mock: { calls: unknown[] } })
        .mock.calls.length
    ).toBe(1)
  })

  it('uses correct max tokens for thinking levels lite and deep', async () => {
    const ai = mkAIClient(async () => ({ text: 'ok' }))
    const mem = mkMemoryService()
    const svc = new NPUService(ai, mem)

    localStorage.setItem(NPU_STORAGE_KEYS.thinkingLevel, 'lite')
    await svc.analyzeAndAdvise('X', 'p1', transcript)
    const calls = (
      ai.models.generateContent as unknown as {
        mock: { calls: GenerateContentRequest[][] }
      }
    ).mock.calls
    let call = calls[0]![0]!
    expect(call.generationConfig.maxOutputTokens).toBe(
      NPU_THINKING_TOKENS['lite']
    )

    localStorage.setItem(NPU_STORAGE_KEYS.thinkingLevel, 'deep')
    await svc.analyzeAndAdvise('Y', 'p1', transcript)
    call = calls[1]![0]!
    expect(call.generationConfig.maxOutputTokens).toBe(
      NPU_THINKING_TOKENS['deep']
    )
  })

  it('limits recent transcript lines to NPU_LIMITS.recentTurns.max', async () => {
    localStorage.setItem(NPU_STORAGE_KEYS.recentTurns, '100') // set above max
    const longTranscript: Turn[] = []
    for (let i = 0; i < 30; i++) {
      longTranscript.push({ speaker: 'user', text: `u${i}` })
      longTranscript.push({ speaker: 'model', text: `m${i}` })
    }

    const cap: { prompt?: string } = {}
    const ai = mkAIClient(async (req: GenerateContentRequest) => {
      cap.prompt = req.contents[0]?.parts[0]?.text || ''
      return { text: 'ok' }
    })
    const mem = mkMemoryService({ memories: [] })
    const svc = new NPUService(ai, mem)
    await svc.analyzeAndAdvise('X', 'p1', longTranscript)

    const startIdx = cap.prompt!.indexOf('RECENT CONVERSATION TURNS:')
    expect(startIdx).toBeGreaterThan(-1)
    const recents = cap.prompt!.slice(startIdx)
    const turnLines = recents.match(/- (USER|MODEL):/g) || []
    expect(turnLines.length).toBe(NPU_LIMITS.recentTurns.max)
  })

  it('truncates very long conversationContext with ellipsis', async () => {
    const longContext = 'X'.repeat(5000)
    const cap: { prompt?: string } = {}
    const ai = mkAIClient(async (req: GenerateContentRequest) => {
      cap.prompt = req.contents[0]?.parts[0]?.text || ''
      return { text: 'ok' }
    })
    const mem = mkMemoryService({ memories: [] })
    const svc = new NPUService(ai, mem)

    await svc.analyzeAndAdvise('X', 'p1', transcript, longContext)
    expect(cap.prompt).toContain('CURRENT CONVERSATION CONTEXT:')
    expect(cap.prompt).toContain('…')
  })

  it('limits memory lines to MAX_MEMORY_LINES', async () => {
    const memories: unknown[] = []
    for (let i = 0; i < 20; i++) {
      memories.push({
        fact_key: `key_${i}`,
        fact_value: `val_${i}`,
        confidence_score: 0.9 - i * 0.01,
        permanence_score: 'permanent',
        timestamp: new Date(),
        conversation_turn: `t${i}`,
        personaId: 'p1',
      })
    }

    const cap: { prompt?: string } = {}
    const ai = mkAIClient(async (req: GenerateContentRequest) => {
      cap.prompt = req.contents[0]?.parts[0]?.text || ''
      return { text: 'ok' }
    })
    const mem = mkMemoryService({ memories })
    const svc = new NPUService(ai, mem)
    await svc.analyzeAndAdvise('X', 'p1', transcript)

    const memLineMatches = cap.prompt?.match(/- .*?\(conf=.*?, perm=/g) || []
    expect(memLineMatches.length).toBe(12) // MAX_MEMORY_LINES
  })
})
