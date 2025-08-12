/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GoogleGenAI,
  type LiveServerMessage,
  Modality,
  type Session,
} from "@google/genai";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { createComponentLogger } from "./src/debug-logger";
import { SummarizationService } from "./src/SummarizationService";
import { SystemPromptManager } from "./src/system-prompt-manager";
import { createBlob, decode, decodeAudioData } from "./utils";
import "./live2d/zip-loader";
import "./live2d/live2d-gate";
import "./settings-menu";
import "./chat-view";
import "./call-transcript";
import "./toast-notification";
import "./controls-panel";
import "./tab-view";
import "./call-history-view";
import type { ToastNotification } from "./toast-notification";
import type { CallSummary, Turn } from "./types";

// Session Manager Architecture Pattern
abstract class BaseSessionManager {
  protected nextStartTime: number = 0;
  protected sources = new Set<AudioBufferSourceNode>();
  protected session: Session | null = null;

  constructor(
    protected outputAudioContext: AudioContext,
    protected outputNode: GainNode,
    protected client: GoogleGenAI,
    protected updateStatus: (msg: string) => void,
    protected updateError: (msg: string) => void,
    protected onRateLimit: (msg: string) => void = () => {},
  ) {}

  // Common audio processing logic
  protected async handleAudioMessage(audio: { data?: string }): Promise<void> {
    this.nextStartTime = Math.max(
      this.nextStartTime,
      this.outputAudioContext.currentTime,
    );

    if (!audio?.data) return;
    const audioBuffer = await decodeAudioData(
      decode(audio.data),
      this.outputAudioContext,
      24000,
      1,
    );
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputNode);
    source.addEventListener("ended", () => this.sources.delete(source));

    source.start(this.nextStartTime);
    this.nextStartTime = this.nextStartTime + audioBuffer.duration;
    this.sources.add(source);
  }

  protected handleInterruption(): void {
    for (const source of this.sources.values()) {
      source.stop();
      this.sources.delete(source);
    }
    this.nextStartTime = 0;
  }

  protected getCallbacks() {
    return {
      onopen: () => {
        this.updateStatus(`${this.getSessionName()} opened`);
      },
      onmessage: async (message: LiveServerMessage) => {
        const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;

        if (audio) {
          await this.handleAudioMessage(audio);
        }

        const interrupted = message.serverContent?.interrupted;
        if (interrupted) {
          this.handleInterruption();
        }
      },
      onerror: (e: ErrorEvent) => {
        // Surface rate-limit hints in error messages
        const msg = e.message || "";
        const isRateLimited = /rate[- ]?limit|quota/i.test(msg);
        if (isRateLimited) {
          this.onRateLimit(msg);
        }
        this.updateError(`${this.getSessionName()} error: ${e.message}`);
      },
      onclose: (e: CloseEvent) => {
        // Check for rate-limit in close reason
        const msg = e.reason || "";
        const isRateLimited = /rate[- ]?limit|quota/i.test(msg);
        if (isRateLimited) {
          this.onRateLimit(msg);
        }
        this.updateStatus(`${this.getSessionName()} closed: ${e.reason}`);
        this.session = null;
      },
    };
  }

  // Abstract methods for mode-specific behavior
  protected abstract getModel(): string;
  protected abstract getConfig(): Record<string, unknown>;
  protected abstract getSessionName(): string;

  public async initSession(): Promise<boolean> {
    await this.closeSession();

    try {
      this.session = await this.client.live.connect({
        model: this.getModel(),
        callbacks: this.getCallbacks(),
        config: this.getConfig(),
      });
      return true;
    } catch (e: any) {
      logger.error(`Error initializing ${this.getSessionName()}:`, e);
      const msg = String(e?.message || e || "");
      this.updateError(`Failed to initialize ${this.getSessionName()}: ${msg}`);
      return false;
    }
  }

  public async closeSession(): Promise<void> {
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {
        logger.warn(`Error closing ${this.getSessionName()}:`, e);
      }
      this.session = null;
    }
  }

  public sendMessage(message: string): void {
    if (this.session) {
      try {
        this.session.sendClientContent({ turns: message });
      } catch (error) {
        logger.error(
          `Error sending message to ${this.getSessionName()}:`,
          error,
        );
        this.updateError(`Failed to send message: ${error.message}`);
      }
    }
  }

  public sendRealtimeInput(input: {
    media: { data?: string; mimeType?: string };
  }): void {
    if (!this.session) return;
    try {
      this.session.sendRealtimeInput(input);
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      this.updateError(`Failed to stream audio: ${msg}`);
    }
  }

  public get isActive(): boolean {
    return this.session !== null;
  }

  public get sessionInstance(): Session | null {
    return this.session;
  }
}

class TextSessionManager extends BaseSessionManager {
  constructor(
    outputAudioContext: AudioContext,
    outputNode: GainNode,
    client: GoogleGenAI,
    updateStatus: (msg: string) => void,
    updateError: (msg: string) => void,
    private updateTranscript: (text: string) => void,
  ) {
    super(outputAudioContext, outputNode, client, updateStatus, updateError);
  }

  protected getCallbacks() {
    const base = super.getCallbacks();
    return {
      ...base,
      onmessage: async (message: LiveServerMessage) => {
        // Handle text response for transcript
        const modelTurn = message.serverContent?.modelTurn;
        if (modelTurn) {
          const lastPart = modelTurn.parts[modelTurn.parts.length - 1];
          const text = lastPart.text;
          if (text) {
            this.updateTranscript(text);
          }
        }

        // Handle audio response
        const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;
        if (audio) {
          await this.handleAudioMessage(audio);
        }

        const interrupted = message.serverContent?.interrupted;
        if (interrupted) {
          this.handleInterruption();
        }
      },
    };
  }

  protected getModel(): string {
    return "gemini-live-2.5-flash-preview";
  }

  protected getConfig(): Record<string, unknown> {
    return {
      responseModalities: [Modality.AUDIO],
      systemInstruction: SystemPromptManager.getSystemPrompt(),
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    };
  }

  protected getSessionName(): string {
    return "Text session";
  }
}

class CallSessionManager extends BaseSessionManager {
  constructor(
    outputAudioContext: AudioContext,
    outputNode: GainNode,
    client: GoogleGenAI,
    updateStatus: (msg: string) => void,
    updateError: (msg: string) => void,
    onRateLimit: (msg: string) => void = () => {},
    private updateCallTranscript: (
      text: string,
      author: "user" | "model",
    ) => void,
  ) {
    super(
      outputAudioContext,
      outputNode,
      client,
      updateStatus,
      updateError,
      onRateLimit,
    );
  }

  protected getModel(): string {
    return "gemini-2.5-flash-exp-native-audio-thinking-dialog";
  }

  protected getConfig(): Record<string, unknown> {
    return {
      responseModalities: [Modality.AUDIO],
      enableAffectiveDialog: true,
      outputAudioTranscription: {}, // Enable transcription of model's audio output
      inputAudioTranscription: {}, // Enable transcription of user's audio input
      systemInstruction: SystemPromptManager.getSystemPrompt(),
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    };
  }

  protected getCallbacks() {
    const base = super.getCallbacks();
    return {
      ...base,
      onmessage: async (message: LiveServerMessage) => {
        // Handle audio transcription for call transcript (model responses)
        if (message.serverContent?.outputTranscription?.text) {
          this.updateCallTranscript(
            message.serverContent.outputTranscription.text,
            "model",
          );
        }

        // Handle input transcription for call transcript (user speech)
        if (message.serverContent?.inputTranscription?.text) {
          this.updateCallTranscript(
            message.serverContent.inputTranscription.text,
            "user",
          );
        }

        // Handle audio response
        const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;
        if (audio) {
          await this.handleAudioMessage(audio);
        }

        const interrupted = message.serverContent?.interrupted;
        if (interrupted) {
          this.handleInterruption();
        }
      },
    };
  }

  protected getSessionName(): string {
    return "Call session";
  }
}

type ActiveMode = "texting" | "calling" | null;

const logger = createComponentLogger("GdmLiveAudio");

@customElement("gdm-live-audio")
export class GdmLiveAudio extends LitElement {
  @state() isCallActive = false;
  @state() status = "";
  @state() error = "";
  private _statusHideTimer: ReturnType<typeof setTimeout> | undefined =
    undefined;
  private _statusClearTimer: ReturnType<typeof setTimeout> | undefined =
    undefined;
  @state() private _toastVisible = false;
  @state() showSettings = false;
  @state() showToast = false;
  @state() toastMessage = "";
  @state() live2dModelUrl =
    localStorage.getItem("live2d-model-url") ||
    "https://gateway.xn--vck1b.shop/models/hiyori_pro_en.zip";

  // Track pending user action for API key validation flow
  private pendingAction: (() => void) | null = null;

  // Track current API key for smart change detection
  private currentApiKey: string = "";

  // Dual-context state management
  @state() activeMode: ActiveMode = null;
  @state() textTranscript: Turn[] = [];
  @state() callTranscript: Turn[] = [];
  @state() textSession: Session | null = null;
  @state() callSession: Session | null = null;
  @state() activeTab: "chat" | "call-history" = "chat";
  @state() callHistory: CallSummary[] = [];

  // Session managers
  private textSessionManager: TextSessionManager;
  private callSessionManager: CallSessionManager;
  private summarizationService: SummarizationService;

  private client: GoogleGenAI;
  private inputAudioContext = new (
    (window as any).AudioContext || (window as any).webkitAudioContext
  )({ sampleRate: 16000 });
  private outputAudioContext = new (
    (window as any).AudioContext || (window as any).webkitAudioContext
  )({ sampleRate: 24000 });
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();

  // Rate-limit UX state for calls
  private _callRateLimitNotified = false;

  // Scroll-to-bottom state for call transcript
  @state() private showCallScrollToBottom = false;
  @state() private callNewMessageCount = 0;

  // Scroll-to-bottom state for chat view
  @state() private showChatScrollToBottom = false;
  @state() private chatNewMessageCount = 0;

  // Audio nodes for each session type
  private textOutputNode = this.outputAudioContext.createGain();
  private callOutputNode = this.outputAudioContext.createGain();

  private mediaStream: MediaStream;
  private sourceNode: MediaStreamAudioSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;

  static styles = css`
    :host {
      display: grid;
      grid-template-columns: 400px 1fr 400px;
      height: 100vh;
      overflow: hidden;
      color: var(--cp-text);
    }

    .main-container {
      z-index: 1;
    }

    #status {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 24px;
      z-index: 10;
      display: flex;
      justify-content: center;
      pointer-events: none;
    }
    #status .toast {
      display: inline-block;
      background: var(--cp-surface);
      color: var(--cp-text);
      padding: 8px 12px;
      border-radius: 10px;
      border: 1px solid var(--cp-surface-border);
      font: 17px/1.2 system-ui;
      box-shadow: var(--cp-glow-cyan);
      opacity: 1;
      transform: translateY(0);
      transition: opacity 300ms ease, transform 300ms ease;
      backdrop-filter: blur(6px);
    }
    #status .toast.hide {
      opacity: 0;
      transform: translateY(10px);
    }


  `;

  constructor() {
    super();
    this.initClient();
  }

  private initSessionManagers() {
    // Initialize session managers after client is ready
    if (this.client) {
      this.textSessionManager = new TextSessionManager(
        this.outputAudioContext,
        this.textOutputNode,
        this.client,
        this.updateStatus.bind(this),
        this.updateError.bind(this),
        this.updateTextTranscript.bind(this),
      );
      this.callSessionManager = new CallSessionManager(
        this.outputAudioContext,
        this.callOutputNode,
        this.client,
        this.updateStatus.bind(this),
        this.updateError.bind(this),
        this._handleCallRateLimit.bind(this),
        this.updateCallTranscript.bind(this),
      );
      this.summarizationService = new SummarizationService(this.client);
    }
  }

  private initAudio() {
    // Audio initialization is now handled by individual session managers
    // Each session manager maintains its own isolated audio timeline
  }

  private async initClient() {
    this.initAudio();

    // Always initialize with texting mode by default (main UI)
    this.activeMode = "texting";

    // Connect both session output nodes to the main audio destination
    this.textOutputNode.connect(this.outputAudioContext.destination);
    this.callOutputNode.connect(this.outputAudioContext.destination);
    this._updateActiveOutputNode();

    const apiKey = localStorage.getItem("gemini-api-key");
    if (!apiKey) {
      // Don't show settings menu on startup - just clear any error/status
      this.error = "";
      this.status = "";
      this.currentApiKey = ""; // Track empty API key
      // Main UI will be shown by default, API key check will happen when user tries to interact
      return;
    }

    // Initialize Google GenAI client if API key exists
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    // Track the current API key for smart change detection
    this.currentApiKey = apiKey;

    // Initialize session managers after client is ready
    this.initSessionManagers();

    // Sessions will be created lazily when user actually interacts
  }

  private _updateActiveOutputNode() {
    // Update the main outputNode to point to the active session's output node
    if (this.activeMode === "texting") {
      this.outputNode = this.textOutputNode;
    } else if (this.activeMode === "calling") {
      this.outputNode = this.callOutputNode;
    }
    // Trigger a re-render to pass the updated outputNode to live2d-gate
    this.requestUpdate();
  }

  private async _initTextSession() {
    const ok = await this.textSessionManager.initSession();
    this.textSession = this.textSessionManager.sessionInstance;
    return ok;
  }

  private async _initCallSession() {
    logger.debug("Initializing new call session.");
    const ok = await this.callSessionManager.initSession();
    this.callSession = this.callSessionManager.sessionInstance;
    return ok;
  }

  private updateStatus(msg: string) {
    this.status = msg;
    // Reset timers and show toast
    if (this._statusHideTimer) clearTimeout(this._statusHideTimer);
    if (this._statusClearTimer) clearTimeout(this._statusClearTimer);
    this._toastVisible = true;

    // Show for 3s, then fade out 300ms, then clear text
    if (!this.error && msg && msg !== " ") {
      this._statusHideTimer = setTimeout(() => {
        this._toastVisible = false; // triggers fade-out via CSS transition
        this._statusClearTimer = setTimeout(() => {
          this.status = "";
        }, 300);
      }, 3000);
    }
  }

  private updateError(msg: string) {
    this.error = msg;
    // Non-silent failure during calls on rate limit
    const isRateLimited = /rate[- ]?limit|quota/i.test(msg || "");
    if (isRateLimited && this.isCallActive) {
      this._handleCallRateLimit(msg);
    }
  }

  private updateTextTranscript(text: string) {
    const lastTurn = this.textTranscript[this.textTranscript.length - 1];
    if (lastTurn?.speaker === "model") {
      lastTurn.text += text;
      this.requestUpdate("textTranscript");
    } else {
      this.textTranscript = [
        ...this.textTranscript,
        { text, speaker: "model" },
      ];
    }
  }

  private updateCallTranscript(text: string, speaker: "user" | "model") {
    logger.debug(`Received ${speaker} text:`, text);

    // For audio transcription, we get incremental chunks that should be appended
    const lastTurn = this.callTranscript[this.callTranscript.length - 1];

    if (lastTurn?.speaker === speaker) {
      // Append to the existing turn by creating a new array
      // This ensures Lit detects the change
      const updatedTranscript = [...this.callTranscript];
      updatedTranscript[updatedTranscript.length - 1] = {
        ...lastTurn,
        text: lastTurn.text + text,
      };
      this.callTranscript = updatedTranscript;
    } else {
      // Create a new turn for this author
      this.callTranscript = [...this.callTranscript, { text, speaker }];
    }
  }

  private _appendCallNotice(text: string) {
    // Append a system-style notice to the call transcript to avoid silent failures
    const notice = { text, speaker: "model" as const, timestamp: new Date() };
    this.callTranscript = [...this.callTranscript, notice];
  }

  private _handleCallRateLimit(msg?: string) {
    if (this._callRateLimitNotified) return;
    this._callRateLimitNotified = true;

    // Also surface the banner in the call transcript
    const callT = this.shadowRoot?.querySelector(
      "call-transcript",
    ) as HTMLElement & { rateLimited?: boolean };
    if (callT) {
      callT.rateLimited = true;
    }
  }

  private _handleTextRateLimit(msg?: string) {
    const toast = this.shadowRoot?.querySelector(
      "toast-notification",
    ) as ToastNotification;
    toast?.show("Rate limit reached. Please wait a moment.", "warning", 3000);
  }

  private async _handleCallStart() {
    if (this.isCallActive) return;

    // Check API key presence before proceeding
    if (!this._checkApiKeyExists()) {
      this._showApiKeyPrompt(() => this._handleCallStart());
      return;
    }

    logger.debug("Call start. Existing callSession:", this.callSession);
    // Switch to calling mode
    this.activeMode = "calling";
    this._updateActiveOutputNode();

    // Initialize or reinitialize call session; if initialization fails, show non-silent failure and abort
    const ok = await this._initCallSession();
    if (!ok || !this.callSession) {
      this._handleCallRateLimit("Call session init failed");
      this.updateStatus("Unable to start call (rate limited or network error)");
      return;
    }

    this.inputAudioContext.resume();
    this.updateStatus("Starting call...");

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus("Call connected");

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 1024;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isCallActive) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);
        // Send audio to the active call session using session manager
        if (this.activeMode === "calling" && this.callSession) {
          try {
            this.callSessionManager.sendRealtimeInput({
              media: createBlob(pcmData),
            });
          } catch (e: any) {
            const msg = String(e?.message || e || "");
            this.updateError(`Failed to stream audio: ${msg}`);
          }
        }
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.isCallActive = true;

      // Dispatch call-start event
      this.dispatchEvent(
        new CustomEvent("call-start", {
          bubbles: true,
          composed: true,
        }),
      );

      this.updateStatus("📞 Call active");
    } catch (err) {
      console.error("Error starting call:", err);
      this.updateStatus(`Error: ${err.message}`);
      this._handleCallEnd();
    }
  }

  private async _handleCallEnd() {
    if (!this.isCallActive && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus("Ending call...");

    this.isCallActive = false;

    if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
      this.scriptProcessorNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.scriptProcessorNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Switch back to texting mode
    this.activeMode = "texting";
    this._updateActiveOutputNode();

    // Summarize the call
    const transcriptToSummarize = [...this.callTranscript];
    this.callTranscript = [];
    const summary = await this.summarizationService.summarize(
      transcriptToSummarize,
    );
    if (summary) {
      this._handleSummarizationComplete(summary, transcriptToSummarize);
    }

    // Text session will be lazily initialized when user sends first message

    // Dispatch call-end event
    this.dispatchEvent(
      new CustomEvent("call-end", {
        bubbles: true,
        composed: true,
      }),
    );

    this.updateStatus("Call ended");
    logger.debug("Call ended. callSession preserved:", this.callSession);
  }

  private _resetTextContext() {
    // Close existing text session using session manager
    if (this.textSessionManager) {
      this.textSessionManager.closeSession();
      this.textSession = null;
    }

    // Clear text transcript
    this.textTranscript = [];

    // Text session will be lazily initialized when user sends next message
    this.updateStatus("Text conversation cleared.");
  }

  private _resetCallContext() {
    logger.debug("Resetting call context. Closing session.");
    // Close existing call session using session manager
    if (this.callSessionManager) {
      this.callSessionManager.closeSession();
      this.callSession = null;
    }

    // Clear call transcript and reset rate-limit states
    this.callTranscript = [];
    this._callRateLimitNotified = false;
    const callT = this.shadowRoot?.querySelector(
      "call-transcript",
    ) as HTMLElement & { rateLimited?: boolean };
    if (callT) {
      callT.rateLimited = false;
    }

    // Reinitialize call session if we're currently in a call
    if (this.isCallActive) {
      this._initCallSession();
    }
    this.updateStatus("Call conversation cleared.");
  }

  private _toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  private _checkApiKeyExists(): boolean {
    const apiKey = localStorage.getItem("gemini-api-key");
    return apiKey !== null && apiKey.trim() !== "";
  }

  private _showApiKeyPrompt(pendingAction?: () => void) {
    // Store the pending action to execute after API key is saved
    this.pendingAction = pendingAction || null;

    // Open settings menu and show toast prompting for API key
    this.showSettings = true;
    this.toastMessage = "P-please tell me ur API key from AI Studio 👉🏻👈🏻";
    this.showToast = true;
  }

  private _handleApiKeySaved() {
    // Show success toast for API key saved
    const toast = this.shadowRoot?.querySelector(
      "toast-notification",
    ) as ToastNotification;
    if (toast) {
      toast.show("API key saved successfully! ✨", "success", 3000);
    }

    logger.info("API key saved, reinitializing client");

    // Reinitialize the client with the new API key
    this.initClient();

    // Close settings menu and toast when API key is saved
    this.showSettings = false;
    this.showToast = false;
    this.toastMessage = "";

    // Execute the pending action if there is one
    if (this.pendingAction) {
      const action = this.pendingAction;
      this.pendingAction = null; // Clear the pending action

      // Execute the action after a brief delay to ensure client is initialized
      // The 100ms delay allows the client initialization to complete before
      // attempting to use the new API key for the pending action
      setTimeout(() => {
        action();
      }, 100);
    }
  }

  private _handleApiKeyChanged() {
    // Get the new API key from localStorage
    const newApiKey = localStorage.getItem("gemini-api-key") || "";

    // Smart change detection - avoid unnecessary reinitialization
    if (newApiKey === this.currentApiKey) {
      logger.debug(
        "API key unchanged, skipping reinitialization:",
        newApiKey ? "***" + newApiKey.slice(-4) : "empty",
      );
      return; // Silently skip - no toast needed
    }

    // Show toast notification for API key change
    const toast = this.shadowRoot?.querySelector(
      "toast-notification",
    ) as ToastNotification;
    if (toast) {
      if (newApiKey) {
        toast.show("API key updated successfully! ✨", "success", 3000);
      } else {
        toast.show("API key cleared", "info", 3000);
      }
    }

    logger.info("API key changed, reinitializing client");

    // Reinitialize the client with the new API key
    this.initClient();
  }

  private _handleModelUrlChanged() {
    // Update the Live2D model URL from localStorage and trigger re-render
    const newModelUrl = localStorage.getItem("live2d-model-url") || "";
    const currentModelUrl = this.live2dModelUrl || "";

    // Check if the URL actually changed
    if (newModelUrl === currentModelUrl) {
      logger.debug(
        "Runtime Model Swap] URL unchanged, skipping reload:",
        newModelUrl,
      );
      return; // Silently skip reload - no toast needed
    }

    this.live2dModelUrl = newModelUrl;

    // Show toast notification to indicate model is changing
    const toast = this.shadowRoot?.querySelector(
      "toast-notification",
    ) as ToastNotification;
    if (toast) {
      toast.show("Loading new Live2D model...", "info", 3000);
    }

    logger.info("Runtime Model Swap] Model URL changed to:", newModelUrl);
  }

  private _handleLive2dLoaded() {
    logger.info("Live2D Success] Model loaded successfully");

    // Show success toast notification
    const toast = this.shadowRoot?.querySelector(
      "toast-notification",
    ) as ToastNotification;
    if (toast) {
      toast.show("Live2D model loaded successfully! ✨", "success", 3000);
    }
  }

  private _handleModelUrlError(e: CustomEvent) {
    const errorMessage = e.detail?.error || "Live2D URL validation failed";
    logger.error("[Model URL Error]", errorMessage);

    // Show error toast notification
    const toast = this.shadowRoot?.querySelector(
      "toast-notification",
    ) as ToastNotification;
    if (toast) {
      toast.show(errorMessage, "error", 4000);
    }
  }

  private _handleLive2dError(e: CustomEvent) {
    const errorMessage = e.detail?.error || "Failed to load Live2D model";
    logger.error("[Live2D Error]", errorMessage);

    // Show error toast notification
    const toast = this.shadowRoot?.querySelector(
      "toast-notification",
    ) as ToastNotification;
    if (toast) {
      toast.show(`Live2D model failed to load: ${errorMessage}`, "error", 5000);
    }
  }

  private _handleSystemPromptChanged() {
    logger.info(
      "System prompt changed. Disconnecting text session and clearing transcript.",
    );

    // Disconnect the active TextSessionManager
    if (this.textSessionManager) {
      this.textSessionManager.closeSession();
      this.textSession = null;
    }

    // Clear the text transcript
    this.textTranscript = [];

    // The session will be re-initialized on the next user message, not immediately.

    const toast = this.shadowRoot?.querySelector(
      "toast-notification",
    ) as ToastNotification;
    if (toast) {
      toast.show("System prompt updated! ✨", "success", 3000);
    }
  }

  private _handleTabSwitch(e: CustomEvent) {
    this.activeTab = e.detail.tab;
  }

  private _handleSummarizationComplete(summary: string, transcript: Turn[]) {
    const newSummary: CallSummary = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      summary,
      transcript: transcript,
    };
    this.callHistory = [newSummary, ...this.callHistory];
  }

  private _startTtsFromSummary(e: CustomEvent) {
    const summary = e.detail.summary as CallSummary;
    // This is a placeholder for the actual TTS implementation
    console.log("Starting TTS for summary:", summary);
    this.textSessionManager.sendMessage(
      `Tell me more about my call regarding "${summary.summary}"`,
    );
    this.activeTab = "chat";
  }

  private _showCuteToast() {
    // Show the cute API key request message
    this.toastMessage = "P-please tell me ur API key from AI Studio 👉🏻👈🏻";
    this.showToast = true;

    // Auto-hide after 6 seconds to give time to read the cute message
    setTimeout(() => {
      this.showToast = false;
      this.toastMessage = "";
    }, 6000);
  }

  private _scrollCallTranscriptToBottom() {
    // Find the call transcript component and scroll it to bottom
    const callTranscript = this.shadowRoot?.querySelector(
      "call-transcript",
    ) as any;
    if (callTranscript && callTranscript._scrollToBottom) {
      callTranscript._scrollToBottom();
      // Reset the scroll state
      this.showCallScrollToBottom = false;
      this.callNewMessageCount = 0;
    }
  }

  private _scrollChatToBottom() {
    const chatView = this.shadowRoot?.querySelector("chat-view") as any;
    if (chatView && chatView._scrollToBottom) {
      chatView._scrollToBottom();
      this.showChatScrollToBottom = false;
      this.chatNewMessageCount = 0;
    }
  }

  private _handleCallScrollStateChanged(e: CustomEvent) {
    // Update the main component's scroll state based on call transcript scroll state
    const { showButton, newMessageCount } = e.detail;
    this.showCallScrollToBottom = showButton;
    this.callNewMessageCount = newMessageCount;
  }

  private _handleChatScrollStateChanged(e: CustomEvent) {
    const { showButton, newMessageCount } = e.detail;
    this.showChatScrollToBottom = showButton;
    this.chatNewMessageCount = newMessageCount;
  }

  private async _handleSendMessage(e: CustomEvent) {
    const message = e.detail;
    if (!message || !message.trim()) {
      return;
    }

    // Check API key presence before proceeding
    if (!this._checkApiKeyExists()) {
      this._showApiKeyPrompt(() => this._handleSendMessage(e));
      return;
    }

    // Add message to text transcript
    this.textTranscript = [
      ...this.textTranscript,
      { text: message, speaker: "user" },
    ];

    // Ensure we have an active text session
    if (!this.textSession) {
      this.updateStatus("Initializing text session...");
      const ok = await this._initTextSession();
      if (!ok || !this.textSession) {
        this.updateError(
          "Unable to start text session (rate limited or network error)",
        );
        return;
      }
    }

    // Send message to text session using session manager
    if (this.textSession) {
      try {
        this.textSessionManager.sendMessage(message);
      } catch (error: any) {
        logger.error("Error sending message to text session:", error);
        const msg = String(error?.message || error || "");
        this.updateError(`Failed to send message: ${msg}`);

        // Try to reinitialize the session and abort if still failing
        const ok = await this._initTextSession();
        if (!ok) {
          return;
        }
      }
    } else {
      this.updateError("Text session not available");
    }
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      "system-prompt-changed",
      this._handleSystemPromptChanged.bind(this),
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(
      "system-prompt-changed",
      this._handleSystemPromptChanged.bind(this),
    );
  }

  render() {
    return html`
      <div class="main-container">
        <tab-view
          .activeTab=${this.activeTab}
          @tab-switch=${this._handleTabSwitch}
        ></tab-view>
        ${
          this.activeTab === "chat"
            ? html`
                <chat-view
                  .transcript=${this.textTranscript}
                  .visible=${this.activeMode !== "calling"}
                  @send-message=${this._handleSendMessage}
                  @reset-text=${this._resetTextContext}
                  @scroll-state-changed=${this._handleChatScrollStateChanged}
                >
                </chat-view>
              `
            : html`
                <call-history-view
                  .callHistory=${this.callHistory}
                  @start-tts-from-summary=${this._startTtsFromSummary}
                >
                </call-history-view>
              `
        }
      </div>

      <div>
        ${
          this.showSettings
            ? html`<settings-menu
                .apiKey=${localStorage.getItem("gemini-api-key") || ""}
                @close=${() => {
                  this.showSettings = false;
                }}
                @api-key-saved=${this._handleApiKeySaved}
                @api-key-changed=${this._handleApiKeyChanged}
                @model-url-changed=${this._handleModelUrlChanged}
                @model-url-error=${this._handleModelUrlError}
              ></settings-menu>`
            : ""
        }
        <controls-panel
          .isCallActive=${this.isCallActive}
          .showCallScrollToBottom=${this.showCallScrollToBottom}
          .callNewMessageCount=${this.callNewMessageCount}
          .showChatScrollToBottom=${this.showChatScrollToBottom}
          .chatNewMessageCount=${this.chatNewMessageCount}
          @toggle-settings=${this._toggleSettings}
          @scroll-call-to-bottom=${this._scrollCallTranscriptToBottom}
          @scroll-chat-to-bottom=${this._scrollChatToBottom}
          @call-start=${this._handleCallStart}
          @call-end=${this._handleCallEnd}
        >
        </controls-panel>

        <div id="status">
          ${
            this.error || this.status
              ? html`<div
                  class="toast ${this._toastVisible ? "" : "hide"}"
                >
                  ${this.error || this.status}
                </div>`
              : ""
          }
        </div>

        <toast-notification
          .visible=${this.showToast}
          .message=${this.toastMessage}
          type="info"
        >
        </toast-notification>

        <live2d-gate
          .modelUrl=${this.live2dModelUrl || ""}
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}
          @live2d-loaded=${this._handleLive2dLoaded}
          @live2d-error=${this._handleLive2dError}
        ></live2d-gate>
      </div>

      <call-transcript
        .transcript=${this.callTranscript}
        .visible=${this.activeMode === "calling"}
        @reset-call=${this._resetCallContext}
        @scroll-state-changed=${this._handleCallScrollStateChanged}
      >
      </call-transcript>
    `;
  }
}
