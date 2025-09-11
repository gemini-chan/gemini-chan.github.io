/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PersonaManager } from '@features/persona/PersonaManager'
import type { SummarizationService } from '@features/summarization/SummarizationService'
import {
  type GoogleGenAI,
  type LiveServerMessage,
  Modality,
  type Session,
} from '@google/genai'
import { createComponentLogger } from '@services/DebugLogger'
import { healthMetricsService } from '@services/HealthMetricsService'
import { energyBarService } from '@services/EnergyBarService'
import type { Turn } from '@shared/types'
import { decode, decodeAudioData } from '@shared/utils'

const logger = createComponentLogger('VPUService')

interface ExtendedLiveServerMessage extends LiveServerMessage {
  sessionResumptionUpdate?: { resumable: boolean; newHandle: string }
  goAway?: { timeLeft: string }
  serverContent?: LiveServerMessage['serverContent'] & {
    sessionResumptionUpdate?: { resumable: boolean; newHandle: string }
    goAway?: { timeLeft: string }
    generationComplete?: boolean
  }
}

// Session Manager Architecture Pattern
export abstract class BaseSessionManager {
  // Resumption handle API
  public getResumptionHandle(): string | null {
    return this.currentHandle
  }
  // Session state and reconnection management
  protected currentHandle: string | null = null
  protected isConnected = false
  protected lastMessageTimestamp = 0
  private reconnecting = false
  private reconnectAttempts = 0
  private reconnectTimer: number | null = null
  private intentionalClose = false
  protected nextStartTime = 0
  protected sources = new Set<AudioBufferSourceNode>()
  protected session: Session | null = null
  protected fallbackPrompt: string | null = null

  // VPU latency tracking properties
  protected vpuStartTimer: (() => void) | null = null
  protected firstOutputReceived = false

  // Session ready promise
  public sessionReady: Promise<void>
  private resolveSessionReady: (value: void | PromiseLike<void>) => void

  constructor(
    protected outputAudioContext: AudioContext,
    protected outputNode: GainNode,
    protected client: GoogleGenAI,
    protected updateStatus: (msg: string) => void,
    protected updateError: (msg: string) => void,
    protected onRateLimit: () => void,
    protected hostElement: HTMLElement
  ) {
    this.sessionReady = new Promise((resolve) => {
      this.resolveSessionReady = resolve
    })
  }

  // Common audio processing logic
  protected async handleAudioMessage(audio: { data?: string }): Promise<void> {
    this.nextStartTime = Math.max(
      this.nextStartTime,
      this.outputAudioContext.currentTime
    )

    if (!audio?.data) return
    const audioBuffer = await decodeAudioData(
      decode(audio.data),
      this.outputAudioContext,
      24000,
      1
    )
    const source = this.outputAudioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.outputNode)
    source.addEventListener('ended', () => {
      this.sources.delete(source)
      this.onAudioEnded()
    })

    source.start(this.nextStartTime)
    this.nextStartTime = this.nextStartTime + audioBuffer.duration
    this.sources.add(source)
  }

  protected handleInterruption(): void {
    for (const source of this.sources.values()) {
      source.stop()
      this.sources.delete(source)
    }
    this.nextStartTime = 0
  }

  protected getCallbacks() {
    return {
      onopen: () => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.resolveSessionReady()
        this.updateStatus(`${this.getSessionName()} opened`)
      },
      onmessage: async (message: LiveServerMessage) => {
        // Update last activity timestamp
        this.lastMessageTimestamp = Date.now()

        const extendedMessage = message as ExtendedLiveServerMessage
        // Session resumption update handling
        const resumptionUpdate =
          extendedMessage.sessionResumptionUpdate ||
          extendedMessage.serverContent?.sessionResumptionUpdate
        if (resumptionUpdate?.resumable && resumptionUpdate?.newHandle) {
          this.currentHandle = resumptionUpdate.newHandle as string
          // The handle is now only stored in memory for the current session.
          this.updateStatus(
            `${this.getSessionName()}: received resumption handle`
          )
        }

        // GoAway handling (pre-termination notice)
        const goAway =
          extendedMessage.goAway || extendedMessage.serverContent?.goAway
        if (goAway?.timeLeft) {
          const timeLeftMs = Number.parseInt(goAway.timeLeft, 10) || 0
          // Schedule a reconnect slightly before the server aborts the connection
          const guard = 250 // ms safety margin
          const delay = Math.max(timeLeftMs - guard, 0)
          if (!this.reconnecting) {
            this.updateStatus(`${this.getSessionName()}: reconnecting soon...`)
            this.hostElement.dispatchEvent(
              new CustomEvent('reconnecting', {
                bubbles: true,
                composed: true,
              })
            )
            window.setTimeout(() => {
              this.reconnectSession()
            }, delay)
          }
        }

        // Audio handling
        const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData
        if (audio) {
          await this.handleAudioMessage(audio)
        }

        // Interruption handling
        const interrupted = message.serverContent?.interrupted
        if (interrupted) {
          this.handleInterruption()
        }
      },
      onerror: (e: ErrorEvent) => {
        const msg = e.message || ''
        const isRateLimited = /rate[- ]?limit|quota/i.test(msg)
        if (isRateLimited) {
          this.onRateLimit()
        }
        this.updateError(`${this.getSessionName()} error: ${e.message}`)
      },
      onclose: (e: CloseEvent) => {
        const msg = e.reason || ''
        const isRateLimited = /rate[- ]?limit|quota/i.test(msg)
        if (isRateLimited) {
          this.onRateLimit()
        }
        this.updateStatus(`${this.getSessionName()} closed: ${e.reason}`)
        this.session = null
        this.isConnected = false
        // If not an intentional close, attempt to reconnect when possible
        if (!this.intentionalClose) {
          this.reconnectSession()
        }
        // Reset the flag after handling
        this.intentionalClose = false
      },
    }
  }

  // Abstract methods for mode-specific behavior
  protected abstract getModel(): string
  protected abstract getConfig(): Record<string, unknown>
  protected abstract getSessionName(): string

  protected onAudioEnded(): void {
    // Default implementation - can be overridden by subclasses
  }

  private async _connect(handle: string | null): Promise<Error | null> {
    try {
      const baseConfig = this.getConfig() || {}
      const configWithResumption: Record<string, unknown> & {
        sessionResumption?: { handle: string | null }
      } = {
        ...baseConfig,
        sessionResumption: { handle },
      }

      this.session = await this.client.live.connect({
        model: this.getModel(),
        callbacks: this.getCallbacks(),
        config: configWithResumption,
      })

      this.isConnected = true
      return null
    } catch (e) {
      const error = e as Error
      logger.error(`Error connecting ${this.getSessionName()}:`, { error })
      const msg = String(error?.message || error || '')
      this.updateError(`Failed to connect ${this.getSessionName()}: ${msg}`)
      return error
    }
  }

  public async initSession(resumptionHandle?: string | null): Promise<boolean> {
    // Reset session ready promise for new session
    this.sessionReady = new Promise((resolve) => {
      this.resolveSessionReady = resolve
    })

    // Merge resumption handle preference: explicit arg > in-memory handle > null
    const handleToUse = resumptionHandle ?? this.currentHandle ?? null

    // Guard to prevent auto-reconnect in onclose during intentional re-init
    this.intentionalClose = true
    await this.closeSession()
    this.intentionalClose = false

    this.updateStatus(
      handleToUse
        ? `${this.getSessionName()}: resuming session...`
        : `${this.getSessionName()}: starting session...`
    )

    const error = await this._connect(handleToUse)
    if (!error) {
      return true
    }

    // If we attempted with a handle and it failed due to invalid/expired handle, clear and retry once
    const msg = String(error.message || error || '')
    const looksLikeInvalidHandle =
      /invalid session resumption handle|expired session resumption handle/i.test(
        msg
      )
    if (handleToUse && looksLikeInvalidHandle) {
      this.updateStatus(
        `${this.getSessionName()}: handle invalid — starting new session`
      )
      this.clearResumptionHandle()
      const retryError = await this._connect(null)
      return !retryError
    }
    return false
  }

  /**
   * Attempt to reconnect the session using the latest resumption handle, with
   * exponential backoff and jitter. Ensures only a single reconnect loop runs.
   */
  public async reconnectSession(): Promise<void> {
    if (this.reconnecting) return
    this.reconnecting = true

    const maxDelay = 15000 // 15s cap
    const baseDelay = 300 // 300ms base

    const attemptReconnect = async () => {
      // If we already have a live session, or if energy is exhausted, end the loop
      if (this.session) {
        this.reconnecting = false
        return
      }

      // PRE-FLIGHT CHECK: do not attempt to reconnect if energy is depleted for this session type
      const sessionType = this.getSessionName().startsWith('Text')
        ? 'tts'
        : 'sts'
      const energyLevel = energyBarService.getCurrentEnergyLevel(sessionType)
      if (energyLevel === 0) {
        this.updateStatus(
          `${this.getSessionName()}: reconnect failed (energy exhausted)`
        )
        this.reconnecting = false
        return // Abort reconnection attempts
      }

      const attempt = this.reconnectAttempts++
      const backoff = Math.min(maxDelay, baseDelay * 2 ** attempt)
      const jitter = Math.random() * 0.2 + 0.9 // 0.9x - 1.1x
      const delay = Math.floor(backoff * jitter)

      this.updateStatus(
        `${this.getSessionName()}: reconnecting (attempt ${attempt + 1})...`
      )

      const ok = await this.initSession(this.currentHandle)
      if (ok && this.session) {
        this.updateStatus(`${this.getSessionName()}: session resumed`)
        this.hostElement.dispatchEvent(
          new CustomEvent('reconnected', {
            bubbles: true,
            composed: true,
          })
        )
        this.reconnectAttempts = 0
        this.reconnecting = false
        return
      }

      // Schedule next attempt
      this.reconnectTimer = window.setTimeout(attemptReconnect, delay)
    }

    attemptReconnect()
  }

  public async closeSession(): Promise<void> {
    if (this.session) {
      try {
        this.intentionalClose = true
        this.session.close()
      } catch (e) {
        logger.warn(`Error closing ${this.getSessionName()}:`, e)
      } finally {
        this.intentionalClose = false
      }
      this.session = null
    }

    // Reset session ready promise for next session
    this.sessionReady = new Promise((resolve) => {
      this.resolveSessionReady = resolve
    })
  }

  /**
   * Simplified send: expects a fully prepared prompt.
   */
  public sendMessage(message: string): void {
    if (!this.session) {
      this.updateError(`${this.getSessionName()} not initialized`)
      return
    }
    try {
      // Start VPU latency timer
      this.vpuStartTimer = healthMetricsService.timeVPUStart()
      this.firstOutputReceived = false

      logger.debug(`Sending message to ${this.getSessionName()}`, {
        textLength: message.length,
      })
      this.session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [{ text: message }],
          },
        ],
        turnComplete: true,
      })
    } catch (error) {
      logger.error(`Error sending message to ${this.getSessionName()}:`, {
        error,
      })
      // Stop the timer on error
      if (this.vpuStartTimer) {
        this.vpuStartTimer()
        this.vpuStartTimer = null
      }
      this.updateError(`Failed to send message: ${(error as Error).message}`)
    }
  }

  public sendRealtimeInput(input: {
    media: { data?: string; mimeType?: string }
  }): void {
    if (!this.session) return
    try {
      this.session.sendRealtimeInput(input)
    } catch (e) {
      const msg = String((e as Error)?.message || e || '')
      this.updateError(`Failed to stream audio: ${msg}`)
    }
  }

  public get isActive(): boolean {
    return this.session !== null
  }

  public get sessionInstance(): Session | null {
    return this.session
  }

  /**
   * Clear any stored session resumption handle so the next init starts fresh.
   */
  public clearResumptionHandle(): void {
    this.currentHandle = null
  }

  /**
   * Handle fallback when energy drops to non-resumable models (STS level 1, TTS level 1).
   * This method summarizes the transcript and combines it with the last 4 turns.
   * @param transcript - The conversation transcript to process
   * @param summarizationService - The service to use for summarization
   */
  public async handleFallback(
    transcript: Turn[],
    summarizationService: SummarizationService
  ): Promise<void> {
    let summary = ''
    try {
      summary = await summarizationService.summarize(transcript)
    } catch (error) {
      logger.error('Failed to summarize transcript:', {
        error,
        transcriptSnippet: transcript
          .map((t) => t.text)
          .join(' ')
          .slice(0, 100),
      })
      // Fallback to a simpler context if summarization fails
      summary = 'Could not summarize previous conversation.'
    }

    const lastFourTurns = transcript.slice(-4)

    const contextParts: string[] = [
      `Summary of previous conversation: ${summary}`,
    ]
    for (const turn of lastFourTurns) {
      contextParts.push(`${turn.speaker}: ${turn.text}`)
    }

    this.fallbackPrompt = contextParts.join('\n')
  }

  protected getSystemInstruction(
    basePrompt: string,
    fallbackPrompt: string | null
  ): string {
    return fallbackPrompt ? `${basePrompt}\n\n${fallbackPrompt}` : basePrompt
  }
}

export class TextSessionManager extends BaseSessionManager {
  private readonly TRANSCRIPTION_IDLE_TIMEOUT_MS = 1200
  private progressCb?: (event: Record<string, unknown>) => void
  private progressTurnId?: string | null = null
  private transcriptionIdleTimer: number | null = null

  constructor(
    outputAudioContext: AudioContext,
    outputNode: GainNode,
    client: GoogleGenAI,
    updateStatus: (msg: string) => void,
    updateError: (msg: string) => void,
    onRateLimit: () => void,
    private updateTranscript: (text: string) => void,
    private onTurnComplete: () => void,
    private personaManager: PersonaManager,
    hostElement: HTMLElement
  ) {
    super(
      outputAudioContext,
      outputNode,
      client,
      updateStatus,
      updateError,
      onRateLimit,
      hostElement
    )
  }

  protected getCallbacks() {
    const base = super.getCallbacks()
    return {
      ...base,
      onmessage: async (message: LiveServerMessage) => {
        const modelTurn = message.serverContent?.modelTurn
        const lastPart = modelTurn?.parts?.[modelTurn.parts.length - 1]
        logger.trace(`${this.getSessionName()} onmessage (pre-base)`, {
          hasModelTurn: !!modelTurn,
          partsCount: modelTurn?.parts?.length || 0,
          hasInlineAudio: !!modelTurn?.parts?.[0]?.inlineData,
          hasText: !!lastPart?.text,
        })
        // Always delegate to base to handle resumption/goAway/generationComplete/audio/interruption
        if (typeof base.onmessage === 'function') {
          await base.onmessage(message)
        }

        // Track VPU start latency on first output transcription or inline audio
        if (!this.firstOutputReceived && this.vpuStartTimer) {
          const hasOutputTranscription =
            !!message.serverContent?.outputTranscription?.text
          const hasInlineAudio =
            !!message.serverContent?.modelTurn?.parts?.[0]?.inlineData

          if (hasOutputTranscription || hasInlineAudio) {
            this.firstOutputReceived = true
            this.vpuStartTimer()
            this.vpuStartTimer = null
            // Emit first output event
            this.progressCb?.({
              type: 'vpu:response:first-output',
              ts: Date.now(),
              data: { turnId: this.progressTurnId },
            })
            logger.debug('VPU start latency tracked', {
              hasOutputTranscription,
              hasInlineAudio,
            })
          }
        }

        // Emit progress event for first output transcription
        if (message.serverContent?.outputTranscription?.text) {
          // Reset idle timer on each transcription chunk
          if (this.transcriptionIdleTimer) {
            window.clearTimeout(this.transcriptionIdleTimer)
          }
          this.transcriptionIdleTimer = window.setTimeout(() => {
            logger.debug('VPU completion: transcription idle fallback')
            this._completeTurn('transcription idle')
          }, this.TRANSCRIPTION_IDLE_TIMEOUT_MS) // 1.2s idle timeout

          this.progressCb?.({
            type: 'vpu:response:transcription',
            ts: Date.now(),
            data: {
              text: message.serverContent.outputTranscription.text,
              turnId: this.progressTurnId,
            },
          })
          this.updateTranscript(message.serverContent.outputTranscription.text)
        }

        // After turn is complete, trigger turn complete handler
        const extendedMessage = message as ExtendedLiveServerMessage
        const genComplete = extendedMessage.serverContent?.generationComplete
        if (genComplete) {
          this._completeTurn('generationComplete')
        }
      },
    }
  }

  private _completeTurn(reason: string): void {
    if (this.progressCb) {
      logger.debug(`VPU turn complete via ${reason}`)
      this.progressCb({
        type: 'vpu:response:complete',
        ts: Date.now(),
        data: { turnId: this.progressTurnId },
      })
      this.onTurnComplete()

      // Clear the callback only after both completion signals have been sent
      this.progressCb = undefined
      this.progressTurnId = null
      if (this.transcriptionIdleTimer) {
        window.clearTimeout(this.transcriptionIdleTimer)
        this.transcriptionIdleTimer = null
      }
    }
  }

  protected getModel(): string {
    // Align text session with energy levels (TTS); if exhausted (level 0), refuse to provide a model
    const model = energyBarService.getCurrentModel('tts')
    if (!model)
      throw new Error('Energy exhausted: no model available for text session')
    return model
  }

  protected getConfig(): Record<string, unknown> {
    const basePrompt = this.personaManager.getActivePersona().systemPrompt
    const systemInstruction = this.getSystemInstruction(
      basePrompt,
      this.fallbackPrompt
    )

    // Removed legacy UI-driven emotion; emotions will be inferred by NPU when needed

    return {
      responseModalities: [Modality.AUDIO],
      outputAudioTranscription: {}, // Enable transcription of model's audio output
      contextWindowCompression: { slidingWindow: {} },
      systemInstruction,
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    }
  }

  protected getSessionName(): string {
    return 'Text session'
  }

  protected override onAudioEnded(): void {
    // Guard against audio-end firing after completion
    if (
      this.sources.size === 0 &&
      this.firstOutputReceived &&
      this.progressCb
    ) {
      logger.debug('VPU completion: audio end fallback')
      this._completeTurn('audio end')
    }
  }

  public override reconnectSession(): Promise<void> {
    // Do nothing. Reconnect is disabled for TTS sessions.
    return Promise.resolve()
  }

  /**
   * Send message through NPU-VPU flow: NPU retrieves memories and formulates RAG prompt,
   * then VPU (the session) responds with the enhanced context.
   */
  public sendMessageWithProgress(
    message: string,
    turnId?: string,
    progressCb?: (event: {
      type: string
      ts: number
      data?: Record<string, unknown>
    }) => void
  ): void {
    if (!this.session) {
      this.updateError(`${this.getSessionName()} not initialized`)
      return
    }
    try {
      // Store progress callback and turn ID for use in onmessage handler
      this.progressCb = progressCb
      this.progressTurnId = turnId

      // Start VPU latency timer
      this.vpuStartTimer = healthMetricsService.timeVPUStart()
      this.firstOutputReceived = false

      // Emit progress event for message sending
      this.progressCb?.({
        type: 'vpu:message:sending',
        ts: Date.now(),
        data: { messageLength: message.length, turnId },
      })

      logger.debug(`Sending message to ${this.getSessionName()}`, {
        textLength: message.length,
      })
      this.session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [{ text: message }],
          },
        ],
        turnComplete: true,
      })
    } catch (error) {
      logger.error(`Error sending message to ${this.getSessionName()}:`, {
        error,
      })
      // Stop the timer on error
      if (this.vpuStartTimer) {
        this.vpuStartTimer()
        this.vpuStartTimer = null
      }
      this.progressCb?.({
        type: 'vpu:message:error',
        ts: Date.now(),
        data: { error: String((error as Error)?.message || error), turnId },
      })
      // Clear progress callback and turn ID on error
      this.progressCb = undefined
      this.progressTurnId = null
      this.updateError(`Failed to send message: ${(error as Error).message}`)
    }
  }
}

export class CallSessionManager extends BaseSessionManager {
  constructor(
    outputAudioContext: AudioContext,
    outputNode: GainNode,
    client: GoogleGenAI,
    updateStatus: (msg: string) => void,
    updateError: (msg: string) => void,
    onRateLimit: () => void,
    private updateCallTranscript: (
      text: string,
      speaker: 'user' | 'model'
    ) => void,
    private personaManager: PersonaManager,
    hostElement: HTMLElement
  ) {
    super(
      outputAudioContext,
      outputNode,
      client,
      updateStatus,
      updateError,
      onRateLimit,
      hostElement
    )
  }

  protected getModel(): string {
    // Choose model based on current energy level for STS; if exhausted (0), refuse to start a call
    const model = energyBarService.getCurrentModel('sts')
    if (!model)
      throw new Error('Energy exhausted: no model available for call session')
    return model
  }

  protected getConfig(): Record<string, unknown> {
    const basePrompt = this.personaManager.getActivePersona().systemPrompt
    const systemInstruction = this.getSystemInstruction(
      basePrompt,
      this.fallbackPrompt
    )

    // Removed legacy UI-driven emotion; emotions will be inferred by NPU when needed

    const config = {
      responseModalities: [Modality.AUDIO],
      contextWindowCompression: { slidingWindow: {} },
      outputAudioTranscription: {}, // Enable transcription of model's audio output
      inputAudioTranscription: {}, // Enable transcription of user's audio input
      systemInstruction,
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      // Always enable affective dialog
      enableAffectiveDialog: true,
    }

    return config
  }

  protected getCallbacks() {
    const base = super.getCallbacks()
    return {
      ...base,
      onmessage: async (message: LiveServerMessage) => {
        const modelTurn = message.serverContent?.modelTurn
        const lastPart = modelTurn?.parts?.[modelTurn.parts.length - 1]
        logger.trace(`${this.getSessionName()} onmessage (pre-base)`, {
          hasModelTurn: !!modelTurn,
          partsCount: modelTurn?.parts?.length || 0,
          hasInlineAudio: !!modelTurn?.parts?.[0]?.inlineData,
          hasText: !!lastPart?.text,
        })
        // Always delegate to base to handle resumption/goAway/generationComplete/audio/interruption
        if (typeof base.onmessage === 'function') {
          await base.onmessage(message)
        }

        // Handle audio transcription for call transcript (model responses)
        if (message.serverContent?.outputTranscription?.text) {
          this.updateCallTranscript(
            message.serverContent.outputTranscription.text,
            'model'
          )
        }

        // Handle input transcription for call transcript (user speech)
        if (message.serverContent?.inputTranscription?.text) {
          this.updateCallTranscript(
            message.serverContent.inputTranscription.text,
            'user'
          )
        }
      },
    }
  }

  protected getSessionName(): string {
    return 'Call session'
  }
}
