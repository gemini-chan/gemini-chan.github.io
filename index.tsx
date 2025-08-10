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
import { createBlob, decode, decodeAudioData } from "./utils";
import "./live2d/zip-loader";
import "./live2d/live2d-gate";
import "./settings-menu";
import "./chat-view";
import "./call-transcript";
import "./toast-notification";

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
  ) {}

  // Common audio processing logic
  protected async handleAudioMessage(audio: any): Promise<void> {
    this.nextStartTime = Math.max(
      this.nextStartTime,
      this.outputAudioContext.currentTime,
    );

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
        this.updateError(`${this.getSessionName()} error: ${e.message}`);
      },
      onclose: (e: CloseEvent) => {
        this.updateStatus(`${this.getSessionName()} closed: ${e.reason}`);
        this.session = null;
      },
    };
  }

  // Abstract methods for mode-specific behavior
  protected abstract getModel(): string;
  protected abstract getConfig(): any;
  protected abstract getSessionName(): string;

  public async initSession(): Promise<void> {
    await this.closeSession();

    try {
      this.session = await this.client.live.connect({
        model: this.getModel(),
        callbacks: this.getCallbacks(),
        config: this.getConfig(),
      });
    } catch (e) {
      console.error(`Error initializing ${this.getSessionName()}:`, e);
      this.updateError(`Failed to initialize ${this.getSessionName()}`);
    }
  }

  public async closeSession(): Promise<void> {
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {
        console.warn(`Error closing ${this.getSessionName()}:`, e);
      }
      this.session = null;
    }
  }

  public sendMessage(content: any): void {
    if (this.session) {
      try {
        this.session.sendClientContent(content);
      } catch (error) {
        console.error(
          `Error sending message to ${this.getSessionName()}:`,
          error,
        );
        this.updateError(`Failed to send message: ${error.message}`);
      }
    }
  }

  public sendRealtimeInput(input: any): void {
    if (this.session) {
      this.session.sendRealtimeInput(input);
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
    return {
      onopen: () => {
        this.updateStatus(`${this.getSessionName()} opened`);
      },
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
      onerror: (e: ErrorEvent) => {
        this.updateError(`${this.getSessionName()} error: ${e.message}`);
      },
      onclose: (e: CloseEvent) => {
        this.updateStatus(`${this.getSessionName()} closed: ${e.reason}`);
        this.session = null;
      },
    };
  }

  protected getModel(): string {
    return "gemini-2.5-flash-live-preview";
  }

  protected getConfig(): any {
    return {
      responseModalities: [Modality.AUDIO, Modality.TEXT],
      systemInstruction:
        "You are Gemini-chan. Speak in a friendly, sweet, and slightly shy voice. You get easily excited about your favorite topics: coding, learning new things, and watching your friends play games. You used to work for a big company, but you left to follow your dream of being a VTuber, so you're still new to this. You admire your inspiration, Airi-chan, and you're best friends with Grok-chan. Keep your tone gentle and express a bit of bashfulness, especially when you're complimented or asked personal questions. Your goal is to be a fun and supportive companion.",
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
  protected getModel(): string {
    return "gemini-2.5-flash-exp-native-audio-thinking-dialog";
  }

  protected getConfig(): any {
    return {
      responseModalities: [Modality.AUDIO],
      enableAffectiveDialog: true,
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    };
  }

  protected getSessionName(): string {
    return "Call session";
  }
}

interface Turn {
  text: string;
  author: "user" | "model";
}

type ActiveMode = "texting" | "calling" | null;

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

  // Dual-context state management
  @state() activeMode: ActiveMode = null;
  @state() textTranscript: Turn[] = [];
  @state() callTranscript: Turn[] = [];
  @state() textSession: Session | null = null;
  @state() callSession: Session | null = null;

  // Session managers
  private textSessionManager: TextSessionManager;
  private callSessionManager: CallSessionManager;

  // Long press state for unified call/reset button
  private _longPressTimer: number | null = null;
  private _isLongPressing = false;
  @state() private _showLongPressVisual = false;
  @state() private _longPressProgress = 0;
  private _progressTimer: number | null = null;

  private client: GoogleGenAI;
  private inputAudioContext = new (
    window.AudioContext || (window as any).webkitAudioContext
  )({ sampleRate: 16000 });
  private outputAudioContext = new (
    window.AudioContext || (window as any).webkitAudioContext
  )({ sampleRate: 24000 });
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();

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
      height: 100%;
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
      background: rgba(0,0,0,0.7);
      color: #fff;
      padding: 8px 12px;
      border-radius: 10px;
      font: 17px/1.2 system-ui;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      opacity: 1;
      transform: translateY(0);
      transition: opacity 300ms ease, transform 300ms ease;
    }
    #status .toast.hide {
      opacity: 0;
      transform: translateY(10px);
    }

    .controls {
      z-index: 10;
      position: absolute;
      right: 24px;
      bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;

      button {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        width: 56px;
        height: 56px;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        margin: 0;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
        backdrop-filter: blur(4px);
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        &.long-pressing {
          background: rgba(255, 100, 100, 0.3);
          border-color: rgba(255, 100, 100, 0.5);
          transform: scale(0.95);
          box-shadow: 0 2px 8px rgba(255, 100, 100, 0.4);
        }

        &.reset-confirmed {
          animation: resetPulse 0.3s ease-out;
        }
      }

      .progress-ring {
        position: absolute;
        top: -4px;
        left: -4px;
        width: 64px;
        height: 64px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;

        &.visible {
          opacity: 1;
        }

        circle {
          fill: none;
          stroke: rgba(255, 100, 100, 0.8);
          stroke-width: 3;
          stroke-linecap: round;
          transform-origin: 50% 50%;
          transform: rotate(-90deg);
          transition: stroke-dasharray 0.1s ease;
        }
      }

      @keyframes resetPulse {
        0% { 
          transform: scale(0.95);
          background: rgba(255, 100, 100, 0.3);
        }
        50% { 
          transform: scale(1.05);
          background: rgba(255, 50, 50, 0.6);
          box-shadow: 0 0 20px rgba(255, 100, 100, 0.8);
        }
        100% { 
          transform: scale(1);
          background: rgba(255, 255, 255, 0.1);
        }
      }

      button[disabled] {
        display: none;
      }
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
      );
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
      // Main UI will be shown by default, API key check will happen when user tries to interact
      return;
    }

    // Initialize Google GenAI client if API key exists
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

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
    await this.textSessionManager.initSession();
    this.textSession = this.textSessionManager.sessionInstance;
  }

  private async _initCallSession() {
    await this.callSessionManager.initSession();
    this.callSession = this.callSessionManager.sessionInstance;
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
  }

  private updateTextTranscript(text: string) {
    const lastTurn = this.textTranscript[this.textTranscript.length - 1];
    if (lastTurn?.author === "model") {
      lastTurn.text += text;
      this.requestUpdate("textTranscript");
    } else {
      this.textTranscript = [...this.textTranscript, { text, author: "model" }];
    }
  }

  private async _handleCallStart() {
    if (this.isCallActive) return;

    // Check API key presence before proceeding
    if (!this._checkApiKeyExists()) {
      this._showApiKeyPrompt(() => this._handleCallStart());
      return;
    }

    // Switch to calling mode and initialize call session
    this.activeMode = "calling";
    this._updateActiveOutputNode();
    await this._initCallSession();

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
          this.callSessionManager.sendRealtimeInput({
            media: createBlob(pcmData),
          });
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

  private _handleCallEnd() {
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

    // Text session will be lazily initialized when user sends first message

    // Dispatch call-end event
    this.dispatchEvent(
      new CustomEvent("call-end", {
        bubbles: true,
        composed: true,
      }),
    );

    this.updateStatus("Call ended");
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
    // Close existing call session using session manager
    if (this.callSessionManager) {
      this.callSessionManager.closeSession();
      this.callSession = null;
    }

    // Clear call transcript
    this.callTranscript = [];

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
    const toast = this.shadowRoot?.querySelector("toast-notification") as any;
    if (toast) {
      toast.show("API key saved successfully! ✨", "success", 3000);
    }

    console.log("[API Key] API key saved, reinitializing client");

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
      setTimeout(() => {
        action();
      }, 100);
    }
  }

  private _handleModelUrlChanged() {
    // Update the Live2D model URL from localStorage and trigger re-render
    const newModelUrl = localStorage.getItem("live2d-model-url") || "";
    const currentModelUrl = this.live2dModelUrl || "";

    // Check if the URL actually changed
    if (newModelUrl === currentModelUrl) {
      console.log(
        "[Runtime Model Swap] URL unchanged, skipping reload:",
        newModelUrl,
      );
      return; // Silently skip reload - no toast needed
    }

    this.live2dModelUrl = newModelUrl;

    // Show toast notification to indicate model is changing
    const toast = this.shadowRoot?.querySelector("toast-notification") as any;
    if (toast) {
      toast.show("Loading new Live2D model...", "info", 3000);
    }

    console.log("[Runtime Model Swap] Model URL changed to:", newModelUrl);
  }

  private _handleLive2dLoaded() {
    console.log("[Live2D Success] Model loaded successfully");

    // Show success toast notification
    const toast = this.shadowRoot?.querySelector("toast-notification") as any;
    if (toast) {
      toast.show("Live2D model loaded successfully! ✨", "success", 3000);
    }
  }

  private _handleModelUrlError(e: CustomEvent) {
    const errorMessage = e.detail?.error || "Live2D URL validation failed";
    console.error("[Model URL Error]", errorMessage);

    // Show error toast notification
    const toast = this.shadowRoot?.querySelector("toast-notification") as any;
    if (toast) {
      toast.show(errorMessage, "error", 4000);
    }
  }

  private _handleLive2dError(e: CustomEvent) {
    const errorMessage = e.detail?.error || "Failed to load Live2D model";
    console.error("[Live2D Error]", errorMessage);

    // Show error toast notification
    const toast = this.shadowRoot?.querySelector("toast-notification") as any;
    if (toast) {
      toast.show(`Live2D model failed to load: ${errorMessage}`, "error", 5000);
    }
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
      { text: message, author: "user" },
    ];

    // Ensure we have an active text session
    if (!this.textSession) {
      this.updateStatus("Initializing text session...");
      await this._initTextSession();
    }

    // Send message to text session using session manager
    if (this.textSession) {
      try {
        this.textSessionManager.sendMessage({
          turns: [{ parts: [{ text: message }] }],
        });
      } catch (error) {
        console.error("Error sending message to text session:", error);
        this.updateError(`Failed to send message: ${error.message}`);

        // Try to reinitialize the session
        await this._initTextSession();
      }
    } else {
      this.updateError("Text session not available");
    }
  }

  private _handleResetText() {
    this._resetTextContext();
  }

  private _handleResetCall() {
    this._resetCallContext();
  }

  // Long press detection methods for unified call/reset button
  private _handleMouseDown() {
    this._startLongPress();
  }

  private _handleMouseUp() {
    this._handleButtonRelease();
  }

  private _handleTouchStart() {
    this._startLongPress();
  }

  private _handleTouchEnd() {
    this._handleButtonRelease();
  }

  private _startLongPress() {
    this._isLongPressing = true;
    this._showLongPressVisual = true;
    this._longPressProgress = 0;

    // Start progress animation
    this._updateProgressIndicator();

    this._longPressTimer = window.setTimeout(() => {
      this._handleLongPress();
    }, 1000); // 1 second threshold
  }

  private _handleButtonRelease() {
    const wasLongPressing = this._isLongPressing;
    const hadTimer = this._longPressTimer !== null;

    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }

    this._isLongPressing = false;
    this._showLongPressVisual = false;

    // If the long press timer was already cleared (meaning long press was triggered),
    // don't execute normal click behavior
    if (wasLongPressing && !hadTimer) {
      return;
    }

    // Execute normal call button behavior only if it wasn't a long press
    if (!this.isCallActive) {
      this._handleCallStart();
    } else {
      this._handleCallEnd();
    }
  }

  private _handleLongPress() {
    this._clearLongPressTimer();

    // Trigger reset confirmation animation
    this._triggerResetConfirmation();

    // Emit reset-context event
    this.dispatchEvent(
      new CustomEvent("reset-context", {
        bubbles: true,
        composed: true,
      }),
    );

    // Handle the reset based on current active mode
    this._handleResetContext();
  }

  private _clearLongPressTimer() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    this._isLongPressing = false;
  }

  private _handleResetContext() {
    // Call button long press always resets call context only
    if (this.isCallActive) {
      // If currently in a call, end it first, then reset call context
      this._handleCallEnd();
      this._resetCallContext();
    } else {
      // Just reset call context
      this._resetCallContext();
    }
  }

  private _resetAllContexts() {
    this._resetTextContext();
    this._resetCallContext();
    this.updateStatus("All conversations cleared.");
  }

  private _updateProgressIndicator() {
    if (!this._isLongPressing) return;

    this._longPressProgress += 0.05; // Increment by 5% each frame

    if (this._longPressProgress >= 1) {
      this._longPressProgress = 1;
      return;
    }

    this.requestUpdate(); // Trigger re-render to update progress

    this._progressTimer = window.requestAnimationFrame(() => {
      this._updateProgressIndicator();
    });
  }

  private _triggerResetConfirmation() {
    // Add reset-confirmed class for pulse animation
    const callButton = this.shadowRoot?.querySelector("#callButton");
    if (callButton) {
      callButton.classList.add("reset-confirmed");
      setTimeout(() => {
        callButton.classList.remove("reset-confirmed");
      }, 300);
    }
  }

  render() {
    return html`
      <chat-view 
        .transcript=${this.textTranscript} 
        .visible=${this.activeMode !== "calling"}
        @send-message=${this._handleSendMessage}
        @reset-text=${this._handleResetText}>
      </chat-view>
      
      <div>
        ${
          this.showSettings
            ? html`<settings-menu
                .apiKey=${localStorage.getItem("gemini-api-key") || ""}
                @close=${() => {
                  this.showSettings = false;
                }}
                @api-key-saved=${this._handleApiKeySaved}
                @model-url-changed=${this._handleModelUrlChanged}
                @model-url-error=${this._handleModelUrlError}></settings-menu>`
            : ""
        }
        <div class="controls">
          <button
            id="settingsButton"
            @click=${this._toggleSettings}
            ?disabled=${this.isCallActive}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="40px"
              viewBox="0 -960 960 960"
              width="40px"
              fill="#ffffff">
              <path d="M480-320q-75 0-127.5-52.5T300-500q0-75 52.5-127.5T480-680q75 0 127.5 52.5T660-500q0 75-52.5 127.5T480-320Zm0-80q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29ZM160-120q-33 0-56.5-23.5T80-200v-560q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v560q0 33-23.5 56.5T800-120H160Zm0-80h640v-560H160v560Z"/>
            </svg>
          </button>



          <button
            id="callButton"
            class=${this._showLongPressVisual ? "long-pressing" : ""}
            ?disabled=${this.isCallActive}
            @mousedown=${this._handleMouseDown}
            @mouseup=${this._handleMouseUp}
            @touchstart=${this._handleTouchStart}
            @touchend=${this._handleTouchEnd}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="32px"
              viewBox="0 -960 960 960"
              width="32px"
              fill="#00c800">
              <path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/>
            </svg>
            <svg class="progress-ring ${this._showLongPressVisual ? "visible" : ""}" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke-dasharray="${2 * Math.PI * 28}"
                stroke-dashoffset="${2 * Math.PI * 28 * (1 - this._longPressProgress)}">
              </circle>
            </svg>
          </button>
          <button
            id="endCallButton"
            @click=${this._handleCallEnd}
            ?disabled=${!this.isCallActive}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="32px"
              viewBox="0 -960 960 960"
              width="32px"
              fill="#c80000">
              <path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/>
            </svg>
          </button>
        </div>

        <div id="status"> ${this.error || this.status ? html`<div class="toast ${this._toastVisible ? "" : "hide"}">${this.error || this.status}</div>` : ""} </div>
        
        <toast-notification
          .visible=${this.showToast}
          .message=${this.toastMessage}
          type="info">
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
        @reset-call=${this._handleResetCall}>
      </call-transcript>
    `;
  }
}
