import { type AIClient, BaseAIService } from '@features/ai/BaseAIService'
import { createComponentLogger } from '@services/DebugLogger'
import { healthMetricsService } from '@services/HealthMetricsService'
import type { VectorStore } from '@store/VectorStore'
import type { Memory } from './Memory'

const logger = createComponentLogger('MemoryService')
const MODEL_NAME = 'gemini-2.5-flash-lite'

export interface IMemoryService {
  retrieveRelevantMemories(
    query: string,
    sessionId: string,
    topK?: number,
    options?: { emotionBias?: string }
  ): Promise<Memory[]>
  getLastModelEmotion(): string
  getAllMemories(): Promise<Memory[]>
  deleteMemory(memoryId: number): Promise<void>
  deleteAllMemories(): Promise<void>
  extractAndStoreFacts(
    turns: string,
    sessionId: string,
    advisorContext?: string
  ): Promise<void> // New method
  applyTimeDecay(): Promise<void>
  pinMemory(memoryId: number): Promise<void>
  unpinMemory(memoryId: number): Promise<void>
}

export class MemoryService extends BaseAIService implements IMemoryService {
  private vectorStore: VectorStore

  // Constants for dynamic gentle rehearsal logic
  private readonly BASELINE_REINFORCEMENT_INCREMENT = 0.2
  private readonly BASELINE_TOP_N = 2
  private readonly EXCITING_EMOTION_INCREMENT = 0.15
  private readonly HEAVY_EMOTION_INCREMENT = 0.05
  private readonly CADENCE_HEURISTIC_INCREMENT = 0.05
  private readonly QUERY_LENGTH_THRESHOLD = 80
  private readonly MIN_TOP_N = 1
  private readonly MAX_TOP_N = 5
  private readonly EXCITING_TOP_N_INCREMENT = 2
  private readonly HEAVY_TOP_N_INCREMENT = 1
  private readonly CADENCE_TOP_N_INCREMENT = 1

  // Constants for stable model preferences and traits
  private readonly STABLE_MODEL_PREFERENCE_CATEGORIES = new Set([
    'color',
    'music',
    'food',
    'animal',
    'style',
    'aesthetic',
    'hobby',
    'genre',
    'game',
    'show',
    'movie',
    'book',
    'drink',
    'snack',
    'season',
    'weather',
    'art',
    'theme',
    'philosophy',
    'ethic',
    'virtue',
    'mood',
    'vibe',
  ])
  private readonly STABLE_MODEL_TRAIT_CATEGORIES = new Set(['pet_name'])

  constructor(vectorStore: VectorStore, client: AIClient) {
    super(client, MODEL_NAME)
    this.vectorStore = vectorStore
  }

  /**
   * Extract facts from conversation turns and store them
   * @param turns The conversation turns to process
   * @param sessionId The user session ID
   */
  // Store the last model emotion for Live2D animation
  private lastModelEmotion: string = 'neutral'

  /**
   * Get the last model emotion detected by the NPU
   * @returns The last model emotion or "neutral" if none detected
   */
  getLastModelEmotion(): string {
    return this.lastModelEmotion
  }

  async extractAndStoreFacts(
    turns: string,
    sessionId: string,
    advisorContext?: string
  ): Promise<void> {
    const stopTimer = healthMetricsService.timeMPUProcessing()

    try {
      logger.debug('Extracting facts from turns', {
        sessionId,
        turnsLength: turns.length,
      })

      // Extract emotional context from advisor context if available
      let emotionalFlavor = ''
      let modelEmotion = 'neutral'
      if (advisorContext) {
        // Look for USER_EMOTION line in advisor context
        const userEmotionLine = advisorContext
          .split('\n')
          .find((line) => line.startsWith('USER_EMOTION:'))
        if (userEmotionLine) {
          const emotionMatch = userEmotionLine.match(/USER_EMOTION:\s*(\w+)/)
          if (emotionMatch) {
            emotionalFlavor = emotionMatch[1]
          }
        }

        // Look for MODEL_EMOTION line in advisor context
        const modelEmotionLine = advisorContext
          .split('\n')
          .find((line) => line.startsWith('MODEL_EMOTION:'))
        if (modelEmotionLine) {
          const emotionMatch = modelEmotionLine.match(/MODEL_EMOTION:\s*(\w+)/)
          if (emotionMatch) {
            modelEmotion = emotionMatch[1]
          }
        }
      }

      // Use Flash Lite to extract facts with strict schema and taxonomy constraints.
      const prompt = `Extract durable, atomic facts from the following conversational snippet.
Return ONLY a JSON array of objects with keys:
- "fact_key": one of the ALLOWED_FACT_KEYS below (use the canonical form)
- "fact_value": short, canonical value (<= 64 chars; no flowery prose)
- "confidence_score": 0..1 (1.0 for explicit statements; lower when implied)
- "permanence_score": one of "permanent" | "temporary" | "contextual"
- "source": "user" | "model" (the speaker who asserted the fact)
- "emotional_flavor" (optional): one of "joy" | "sadness" | "anger" | "fear" | "surprise" | "curiosity" | "neutral"
- "emotion_confidence" (optional): 0..1

Emotional context (bias only, do not restate):
USER_EMOTION = ${emotionalFlavor || 'neutral'}
MODEL_EMOTION = ${modelEmotion || 'neutral'}

ALLOWED_FACT_KEYS (canonical forms + mapping rules):
(For general preferences, prefer this dynamic canonical form; do not invent category names, use short lowercase tokens)
- user_preference.<category>
- model_preference.<category>
(If the user says "favorite", you may output as user_preference.<category> instead of user_favorite.<category>.)
- user_core_identity_name (synonyms: "user_name", "my name is ...", "call me ...")
- user_preferred_name (synonyms: "nickname", "preferred name")
- user_interest (synonyms: "hobby", "likes", "drawn to", "interested in")
- user_goal (synonyms: "aim", "objective", "wants to", "trying to")
- user_name_meaning (synonyms: "my name means ...")
- user_question_topic (synonyms: "user asked about ..."; store topic only, e.g., "model_name_meaning")
- user_trait.<category> (examples: pet_name)
- user_preference.<category> (examples of <category>: color, food, music, animal, sport, movie)

- model_core_identity_name (synonyms: "your name", "model name", "persona name")
- model_name_pronunciation (synonyms: "how to pronounce your name")
- model_capability (synonyms: "can help with", "offers", "expertise in")
- model_alias_name (synonyms: "english name", "alternate name"; only if explicitly given)
- model_trait.<category> (examples: pet_name)
- model_preference.<category> (examples of <category>: color, food, music, animal, sport, movie)

DO NOT STORE (hard rules):
- Rhetorical questions, style/poetry, acknowledgments, fillers, invitations.
- Restatements of the user's question as a fact.
- Long narrative strings; keep values short and atomic.
- Facts without clear attribution.

ATTRIBUTION RULES:
- If the user says "my name is X" -> source="user" and fact_key="user_core_identity_name".
- Never assign the user's name to any "model_*" key.
- If the model states its own identity -> source="model" and fact_key="model_core_identity_name".
- If the user asks a question -> store a single "user_question_topic" like "model_name_meaning".

PERMANENCE GUIDANCE:
- permanent: stable identity (names), long-term user interests/goals explicitly stated.
- contextual: situational questions/topics; ephemeral details.
- temporary: fleeting, time-bound info.

LIMITS:
- Max 5 facts.
- Skip any item if confidence < 0.7.
- Truncate fact_value to <= 64 chars.

POSITIVE EXAMPLES:
[{"fact_key":"user_core_identity_name","fact_value":"Vi","confidence_score":1.0,"permanence_score":"permanent","source":"user"},
 {"fact_key":"model_core_identity_name","fact_value":"ᛃᛖᛗᛁᚾᛁ","confidence_score":0.95,"permanence_score":"permanent","source":"model"},
 {"fact_key":"model_name_pronunciation","fact_value":"Yem-i-nee","confidence_score":0.9,"permanence_score":"permanent","source":"model"},
 {"fact_key":"user_interest","fact_value":"developing AI agents with RAG and EMO","confidence_score":0.95,"permanence_score":"permanent","source":"user"},
 {"fact_key":"user_question_topic","fact_value":"model_name_meaning","confidence_score":0.9,"permanence_score":"contextual","source":"user"}]

CONVERSATION SNIPPET (role-tagged if available; else raw text):
${turns}

Return ONLY the JSON array. No markdown, no prose.`

      const response = await this.callAIModel(prompt)

      // Parse the JSON response
      interface ExtractedFact {
        fact_key: string
        fact_value: string
        confidence_score: number
        permanence_score: string
        emotional_flavor?: string
        emotion_confidence?: number
        source?: 'user' | 'model'
      }

      let facts: ExtractedFact[] = []
      try {
        const jsonResponse = String(response || '').trim()
        // Extract JSON array from response if it's wrapped in markdown
        const jsonMatch = jsonResponse.match(/\[[\s\S]*\]/)
        const jsonString = jsonMatch ? jsonMatch[0] : jsonResponse
        facts = JSON.parse(jsonString)
      } catch (parseError) {
        logger.warn(
          'Failed to parse JSON response, falling back to line parsing',
          { parseError, response }
        )
        // Fallback to line parsing if JSON parsing fails
        const lines = String(response || '')
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && (/^[-*]\s+/.test(l) || /:\s*/.test(l)))

        facts = lines.map((line) => {
          // Remove leading bullet if present
          const cleaned = line.replace(/^[-*]\s+/, '')
          const [rawKey, ...rest] = cleaned.split(':')
          const key = (rawKey || 'fact').trim().slice(0, 64) || 'fact'
          const value = rest.join(':').trim()
          return {
            fact_key: key,
            fact_value: value || cleaned,
            confidence_score: 0.8,
            permanence_score: 'contextual',
          } as ExtractedFact
        })
      }

      // Sanitize and store facts in the vector store
      // Fixed keys allowed; dynamic preferences validated via regex
      const FIXED_FACT_KEYS = new Set([
        'user_core_identity_name',
        'user_preferred_name',
        'user_interest',
        'user_goal',
        'user_name_meaning',
        'user_question_topic',
        // dynamic traits allowed via user_trait.<category>

        'model_core_identity_name',
        'model_name_pronunciation',
        'model_capability',
        'model_alias_name',
      ])

      const isPreferenceKey = (k: string) =>
        /^(user|model)_preference\.[a-z0-9_-]{1,32}$/.test(k)
      const isTraitKey = (k: string) =>
        /^(user|model)_trait\.[a-z0-9_-]{1,32}$/.test(k)
      const isAllowedKey = (k: string) =>
        FIXED_FACT_KEYS.has(k) || isPreferenceKey(k) || isTraitKey(k)

      const sanitizeValue = (val?: string): string => {
        const s = (val || '').trim()
        const collapsed = s.replace(/\s+/g, ' ').replace(/^"|"$/g, '')
        return collapsed.slice(0, 64)
      }

      const isLowUtility = (key: string, value: string): boolean => {
        const k = key.toLowerCase()
        const v = value.toLowerCase()
        // Heuristics to drop rhetorical/acknowledgment/poetic lines
        if (/acknowledg|wondrous|enchant|grand quest|woven from/.test(v))
          return true
        if (
          /does that (resonance|sound) speak|how do you feel|shall we|tell me,/.test(
            v
          )
        )
          return true
        if (/response_to|description_of|question_about_user_feeling/.test(k))
          return true
        return false
      }

      const coercePermanence = (
        key: string,
        proposed?: string
      ): 'permanent' | 'temporary' | 'contextual' => {
        const k = key.toLowerCase()
        if (
          k === 'user_core_identity_name' ||
          k === 'user_preferred_name' ||
          k === 'model_core_identity_name' ||
          k === 'model_name_pronunciation' ||
          k === 'user_interest' ||
          k === 'user_goal'
        ) {
          return 'permanent'
        }
        if (k === 'user_question_topic') return 'contextual'
        return this.normalizePermanenceScore(proposed) || 'contextual'
      }

      // Apply stability decay and rare spontaneous rehearsal (human-like memory)
      // (Decay is handled in applyTimeDecay; rehearsal happens on retrieval; here we just filter and keep facts compact)
      const sanitizedFacts = facts
        .filter(
          (f) =>
            !!f &&
            typeof f.fact_key === 'string' &&
            typeof f.fact_value === 'string'
        )
        .map((f) => ({
          ...f,
          fact_key: f.fact_key.trim(),
          fact_value: sanitizeValue(f.fact_value),
          confidence_score: Math.max(
            0,
            Math.min(1, Number(f.confidence_score ?? 0.8))
          ),
          permanence_score: coercePermanence(f.fact_key, f.permanence_score),
          source:
            f.source === 'user' || f.source === 'model' ? f.source : undefined,
          emotional_flavor: this.normalizeEmotionLabel(f.emotional_flavor),
          emotion_confidence:
            f.emotion_confidence &&
            f.emotion_confidence >= 0 &&
            f.emotion_confidence <= 1
              ? f.emotion_confidence
              : undefined,
        }))
        .filter((f) => isAllowedKey(f.fact_key))
        .filter((f) => f.confidence_score >= 0.7)
        .filter((f) => !isLowUtility(f.fact_key, f.fact_value))
        .slice(0, 5)

      // Protect core model identity and preferences: auto-pin stability
      // Auto-pin rules for stable personality traits
      const PROTECTED_MODEL_KEYS = new Set([
        'model_core_identity_name',
        'model_name_pronunciation',
        'model_alias_name',
      ])

      const isStableModelPreference = (key: string) => {
        const prefMatch = key.match(/^model_preference\.([a-z0-9_-]{1,32})$/)
        if (prefMatch) {
          const category = prefMatch[1]
          return this.STABLE_MODEL_PREFERENCE_CATEGORIES.has(category)
        }
        const traitMatch = key.match(/^model_trait\.([a-z0-9_-]{1,32})$/)
        if (traitMatch) {
          const category = traitMatch[1]
          return this.STABLE_MODEL_TRAIT_CATEGORIES.has(category) // Auto-pin pet_name trait
        }
        return false
      }

      for (const fact of sanitizedFacts) {
        const permanence =
          this.normalizePermanenceScore(fact.permanence_score) || 'contextual'

        // Sanitize malformed preference keys (e.g., user_preference_preference.animal -> user_preference.animal)
        const sanitizedFactKey = (fact.fact_key || 'fact').replace(
          /_preference_preference\./,
          '_preference.'
        )

        const payload = {
          // Enforce canonical user/model source; fallback to undefined
          fact_key: sanitizedFactKey,
          fact_value: fact.fact_value || '',
          confidence_score: fact.confidence_score || 0.8,
          permanence_score: permanence,
          personaId: sessionId,
          timestamp: new Date(),
          conversation_turn: turns,
          emotional_flavor:
            this.normalizeEmotionLabel(fact.emotional_flavor) ||
            this.normalizeEmotionLabel(emotionalFlavor) ||
            undefined,
          emotion_confidence:
            fact.emotion_confidence || (emotionalFlavor ? 0.7 : undefined),
          user_emotion: emotionalFlavor || undefined,
          model_emotion: modelEmotion || undefined,
          source: fact.source || undefined,
        } as const

        // Save the memory and get the saved memory object with its ID
        const savedMemory = await this.vectorStore.saveMemory(payload)

        // If this is a protected model fact or a stable model preference, ensure permanence by pinning
        if (
          (PROTECTED_MODEL_KEYS.has(fact.fact_key) ||
            isStableModelPreference(fact.fact_key)) &&
          payload.permanence_score !== 'permanent'
        ) {
          try {
            if (savedMemory?.id) {
              await this.pinMemory(savedMemory.id)
            }
          } catch (e) {
            logger.warn('Failed to auto-pin protected model fact', {
              e,
              factKey: fact.fact_key,
            })
          }
        }
      }

      // Adjust facts reference to sanitized ones for logging
      const factsAfterSanitizationCount = sanitizedFacts.length

      logger.info('Fact extraction and storage completed for session', {
        sessionId,
        factCount: factsAfterSanitizationCount,
      })

      // Store the model emotion for Live2D animation
      this.lastModelEmotion = modelEmotion
    } catch (error) {
      logger.error('Failed to extract and store facts', { error, sessionId })
    } finally {
      stopTimer()
    }
  }

  /**
   * Normalize emotion label to ensure it's one of our canonical set
   * @param emotion The emotion label to normalize
   * @returns Normalized emotion label
   */
  private normalizeEmotionLabel(emotion?: string): string | undefined {
    if (!emotion) return undefined

    const normalized = emotion.toLowerCase().trim()

    // Map to our canonical set
    switch (normalized) {
      case 'joy':
      case 'happy':
      case 'pleased':
      case 'delighted':
      case 'excited':
        return 'joy'
      case 'sadness':
      case 'sad':
      case 'depressed':
      case 'melancholy':
      case 'grief':
        return 'sadness'
      case 'anger':
      case 'angry':
      case 'furious':
      case 'irritated':
      case 'annoyed':
        return 'anger'
      case 'fear':
      case 'afraid':
      case 'scared':
      case 'anxious':
      case 'worried':
        return 'fear'
      case 'surprise':
      case 'surprised':
      case 'amazed':
      case 'astonished':
        return 'surprise'
      case 'curiosity':
      case 'curious':
      case 'interested':
      case 'intrigued':
        return 'curiosity'
      case 'neutral':
      case 'calm':
      case 'peaceful':
        return 'neutral'
      default:
        // Default to neutral for unrecognized emotions
        return 'neutral'
    }
  }

  /**
   * Normalize permanence score to ensure it's one of the allowed values
   * @param score The permanence score to normalize
   * @returns Normalized permanence score
   */
  private normalizePermanenceScore(
    score?: string
  ): 'permanent' | 'temporary' | 'contextual' | undefined {
    if (!score) return undefined

    const normalized = score.toLowerCase().trim()
    switch (normalized) {
      case 'permanent':
        return 'permanent'
      case 'temporary':
        return 'temporary'
      case 'contextual':
        return 'contextual'
      default:
        // Map common synonyms
        if (
          normalized.includes('long') ||
          normalized.includes('forever') ||
          normalized.includes('always')
        ) {
          return 'permanent'
        }
        if (
          normalized.includes('short') ||
          normalized.includes('brief') ||
          normalized.includes('momentary')
        ) {
          return 'temporary'
        }
        return 'contextual' // Default fallback
    }
  }

  /**
   * Retrieve relevant memories for a given query using semantic search
   * @param query The search query to find relevant memories for
   * @param sessionId The user session ID
   * @param topK The number of top memories to retrieve (default: 5)
   * @returns Array of relevant Memory objects
   */
  // Cache for memory search results to improve performance
  private searchCache = new Map<
    string,
    { result: Memory[]; timestamp: number }
  >()
  private readonly CACHE_TTL = 30000 // 30 seconds

  async retrieveRelevantMemories(
    query: string,
    sessionId: string,
    topK: number = 5,
    options?: { emotionBias?: string }
  ): Promise<Memory[]> {
    try {
      // Check cache first (cache key excludes emotion bias to keep it simple and fresh)
      const cacheKey = `${sessionId}:${query.toLowerCase().trim()}`
      const cached = this.searchCache.get(cacheKey)
      const now = Date.now()

      if (cached && now - cached.timestamp < this.CACHE_TTL) {
        logger.debug('Using cached memory results', { query, sessionId })
        return cached.result.slice(0, topK)
      }

      logger.debug('Retrieving relevant memories', {
        query,
        sessionId,
        topK,
        hasEmotionBias: !!options?.emotionBias,
      })

      // Use the vector store to perform semantic search
      // Note: searchMemories uses similarity threshold (0.8 default), not topK
      const relevantMemories = await this.vectorStore.searchMemories(
        query,
        0.6 // Lower threshold to collect more candidates for re-ranking
      )

      // Re-rank by composite score: similarity, recency, reinforcement, and optional emotion bias
      const HALF_LIFE_HOURS = 72 // 3 days half-life for recency
      const emotionBias = (options?.emotionBias || '').toLowerCase().trim()

      const withScores = relevantMemories.map((m) => {
        const similarity = typeof m.similarity === 'number' ? m.similarity : 0

        // Recency score: exp(-age / halfLife)
        const ts = m.timestamp ? new Date(m.timestamp) : null
        const ageHours = ts
          ? Math.max(0, (now - ts.getTime()) / 36e5)
          : Infinity
        const recency = ts ? Math.exp(-ageHours / HALF_LIFE_HOURS) : 0

        // Reinforcement score: 1 - exp(-count / k)
        const count = m.reinforcement_count || 0
        const reinforcement = 1 - Math.exp(-count / 3)

        // Emotion match boost
        const emo = (m.emotional_flavor || '').toLowerCase().trim()
        const emotionMatch =
          emotionBias && emo ? (emo === emotionBias ? 1 : 0) : 0

        // Subject/source match boost (prefer user facts for user-ish queries, model facts for model-ish queries)
        let subjectMatch = 0
        const q = query.toLowerCase()
        const isUserish = /\bmy\b|\bme\b|\bi\b/.test(q)
        const isModelish = /\byour\b|\byou\b|model|persona|pronounce/.test(q)
        if (isUserish && m.source === 'user') subjectMatch = 1
        if (isModelish && m.source === 'model') subjectMatch = 1

        // Weighted composite
        const score =
          0.55 * similarity +
          0.18 * recency +
          0.12 * reinforcement +
          0.1 * emotionMatch +
          0.05 * subjectMatch

        // Debug logging for re-ranking contributions if DEV_DEBUG is enabled
        if (typeof process !== 'undefined' && process.env.DEV_DEBUG === '1') {
          logger.debug('Memory re-ranking contribution', {
            factKey: m.fact_key,
            similarity: similarity.toFixed(3),
            recency: recency.toFixed(3),
            reinforcement: reinforcement.toFixed(3),
            emotionMatch: emotionMatch.toFixed(3),
            subjectMatch: subjectMatch.toFixed(3),
            compositeScore: score.toFixed(3),
            emotionalFlavor: m.emotional_flavor,
            emotionBias: emotionBias || 'none',
            source: m.source || 'unknown',
          })
        }

        return {
          mem: m,
          score,
          similarity,
          recency,
          reinforcement,
          emotionMatch,
        }
      })

      withScores.sort((a, b) => b.score - a.score)

      // Dynamic gentle rehearsal: emotion-aware and cadence-aware
      try {
        const exciting = new Set(['joy', 'curiosity', 'surprise'])
        const calmish = new Set(['neutral'])
        const heavy = new Set(['anger', 'sadness', 'fear'])
        const eb = (emotionBias || 'neutral').toLowerCase()

        // Baseline increment and topN
        let inc = this.BASELINE_REINFORCEMENT_INCREMENT
        let topN = this.BASELINE_TOP_N
        if (exciting.has(eb)) {
          inc += this.EXCITING_EMOTION_INCREMENT
          topN += this.EXCITING_TOP_N_INCREMENT
        } else if (heavy.has(eb)) {
          inc += this.HEAVY_EMOTION_INCREMENT
          topN += this.HEAVY_TOP_N_INCREMENT
        } else if (calmish.has(eb)) {
          /* keep baseline */
        }

        // Cadence heuristic from query: excitement or longer inputs
        const qLower = query.toLowerCase()
        if (
          qLower.includes('!') ||
          qLower.length > this.QUERY_LENGTH_THRESHOLD
        ) {
          inc += this.CADENCE_HEURISTIC_INCREMENT
          topN += this.CADENCE_TOP_N_INCREMENT
        }
        topN = Math.min(
          Math.max(this.MIN_TOP_N, topN),
          Math.min(this.MAX_TOP_N, withScores.length)
        )

        await Promise.all(
          withScores.slice(0, topN).map(async (x) => {
            const m = x.mem
            if (!m?.id) return
            const mem = await this.vectorStore.getMemoryById(m.id)
            if (!mem) return
            mem.reinforcement_count = (mem.reinforcement_count || 0) + inc
            await this.vectorStore.saveMemory(mem)
          })
        )
      } catch (e) {
        logger.warn('Failed dynamic gentle rehearsal reinforcement', { e })
      }

      const limitedMemories = withScores.slice(0, topK).map((x) => x.mem)

      // Cache the result (cache the re-ranked set)
      this.searchCache.set(cacheKey, {
        result: limitedMemories,
        timestamp: now,
      })

      // Clean up old cache entries
      for (const [key, value] of this.searchCache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.searchCache.delete(key)
        }
      }

      logger.debug('Retrieved memories (re-ranked)', {
        query,
        sessionId,
        memoryCount: limitedMemories.length,
        cached: false,
      })

      return limitedMemories
    } catch (error) {
      logger.error('Failed to retrieve relevant memories', {
        error,
        query,
        sessionId,
        topK,
      })
      return [] // Return empty array on failure
    }
  }

  /**
   * Retrieve all memories for the current persona.
   */
  async getAllMemories(): Promise<Memory[]> {
    try {
      logger.debug('Retrieving all memories')
      const memories = await this.vectorStore.getAllMemories()
      logger.debug('Retrieved all memories', { count: memories.length })
      return memories
    } catch (error) {
      logger.error('Failed to retrieve all memories', { error })
      return []
    }
  }

  /**
   * Delete a specific memory by its ID.
   * @param memoryId The ID of the memory to delete.
   */
  async deleteMemory(memoryId: number): Promise<void> {
    try {
      logger.debug('Deleting memory', { memoryId })
      await this.vectorStore.deleteMemory(memoryId)
      logger.debug('Deleted memory successfully', { memoryId })
    } catch (error) {
      logger.error('Failed to delete memory', { error, memoryId })
    }
  }

  /**
   * Delete all memories for the current persona.
   */
  async deleteAllMemories(): Promise<void> {
    try {
      logger.debug('Deleting all memories')
      await this.vectorStore.deleteAllMemories()
      logger.debug('Deleted all memories successfully')
    } catch (error) {
      logger.error('Failed to delete all memories', { error })
    }
  }

  /**
   * Apply time decay to memories based on confidence score and age
   * Lower confidence memories decay faster over time
   */
  async applyTimeDecay(): Promise<void> {
    try {
      logger.debug('Applying time decay to memories')
      const allMemories = await this.getAllMemories()
      const now = Date.now()

      for (const memory of allMemories) {
        // Skip pinned memories
        if (memory.permanence_score === 'permanent') continue

        const age = now - memory.timestamp.getTime()
        const ageInDays = age / (24 * 60 * 60 * 1000)

        // Apply decay based on confidence score and age
        // Lower confidence memories decay faster
        const confidence = memory.confidence_score || 0.5
        const decayFactor = Math.pow(0.9, ageInDays * (1 - confidence))

        // If decay factor is below threshold, delete the memory
        if (decayFactor < 0.3) {
          logger.debug('Decaying memory due to low confidence and age', {
            factKey: memory.fact_key,
            confidence: confidence,
            ageInDays: ageInDays.toFixed(2),
            decayFactor: decayFactor.toFixed(2),
          })
          await this.deleteMemory(memory.id!)
        }
      }
    } catch (error) {
      logger.error('Failed to apply time decay', { error })
    }
  }

  /**
   * Pin a memory to prevent it from being decayed or deleted
   * @param memoryId The ID of the memory to pin
   */
  async pinMemory(memoryId: number): Promise<void> {
    try {
      logger.debug('Pinning memory', { memoryId })
      const memory = await this.vectorStore.getMemoryById(memoryId)
      if (memory) {
        // Update the permanence score to "permanent" to prevent decay
        memory.permanence_score = 'permanent'
        await this.vectorStore.saveMemory(memory)
      }
    } catch (error) {
      logger.error('Failed to pin memory', { error, memoryId })
    }
  }

  /**
   * Unpin a memory to allow it to be decayed or deleted normally
   * @param memoryId The ID of the memory to unpin
   */
  async unpinMemory(memoryId: number): Promise<void> {
    try {
      logger.debug('Unpinning memory', { memoryId })
      const memory = await this.vectorStore.getMemoryById(memoryId)
      if (memory) {
        // Update the permanence score to "contextual" to allow normal decay
        memory.permanence_score = 'contextual'
        await this.vectorStore.saveMemory(memory)
      }
    } catch (error) {
      logger.error('Failed to unpin memory', { error, memoryId })
    }
  }
}
