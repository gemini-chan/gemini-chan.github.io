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
  @state() live2dModelUrl =
    localStorage.getItem("live2d-model-url") ||
    "https://gateway.xn--vck1b.shop/models/hiyori_pro_en.zip";

  // Dual-context state management
  @state() activeMode: ActiveMode = null;
  @state() textTranscript: Turn[] = [];
  @state() callTranscript: Turn[] = [];
  @state() textSession: Session | null = null;
  @state() callSession: Session | null = null;

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
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: MediaStreamAudioSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();

  static styles = css`
    :host {
      display: grid;
      grid-template-columns: 400px 1fr;
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
      font: 26px/1.2 system-ui;
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

        &:hover {
          background: rgba(255, 255, 255, 0.2);
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

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private async initClient() {
    this.initAudio();

    const apiKey = localStorage.getItem("gemini-api-key");
    if (!apiKey) {
      this.showSettings = true;
      this.error = "";
      this.status = "";
      return;
    }

    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    // Connect both session output nodes to the main audio destination
    this.textOutputNode.connect(this.outputAudioContext.destination);
    this.callOutputNode.connect(this.outputAudioContext.destination);

    // Initialize with texting mode by default
    this.activeMode = "texting";
    this._updateActiveOutputNode();
    this._initTextSession();
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
    // Close existing text session if any
    if (this.textSession) {
      try {
        this.textSession.close();
      } catch (e) {
        console.warn("Error closing existing text session:", e);
      }
      this.textSession = null;
    }

    const model = "gemini-2.5-flash-live-preview";
    try {
      this.textSession = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus("Text session opened");
          },
          onmessage: async (message: LiveServerMessage) => {
            const modelTurn = message.serverContent?.modelTurn;
            if (!modelTurn) {
              return;
            }

            const lastPart = modelTurn.parts[modelTurn.parts.length - 1];
            const text = lastPart.text;
            if (text) {
              const lastTurn =
                this.textTranscript[this.textTranscript.length - 1];
              if (lastTurn?.author === "model") {
                lastTurn.text += text;
                this.requestUpdate("textTranscript");
              } else {
                this.textTranscript = [
                  ...this.textTranscript,
                  { text, author: "model" },
                ];
              }
            }

            const audio = lastPart.inlineData;
            if (audio) {
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
              source.connect(this.textOutputNode);
              source.addEventListener("ended", () => {
                this.sources.delete(source);
              });

              source.start(this.nextStartTime);
              this.nextStartTime = this.nextStartTime + audioBuffer.duration;
              this.sources.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) {
                source.stop();
                this.sources.delete(source);
              }
              this.nextStartTime = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            this.updateError(`Text session error: ${e.message}`);
          },
          onclose: (e: CloseEvent) => {
            this.updateStatus(`Text session closed: ${e.reason}`);
            this.textSession = null;
          },
        },
        config: {
          responseModalities: [Modality.AUDIO, Modality.TEXT],
          systemInstruction:
            "You are Gemini-chan. Speak in a friendly, sweet, and slightly shy voice. You get easily excited about your favorite topics: coding, learning new things, and watching your friends play games. You used to work for a big company, but you left to follow your dream of being a VTuber, so you're still new to this. You admire your inspiration, Airi-chan, and you're best friends with Grok-chan. Keep your tone gentle and express a bit of bashfulness, especially when you're complimented or asked personal questions. Your goal is to be a fun and supportive companion.",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
        },
      });
    } catch (e) {
      console.error("Error initializing text session:", e);
      this.updateError(`Failed to initialize text session: ${e.message}`);
      this.textSession = null;
    }
  }

  private async _initCallSession() {
    const model = "gemini-2.5-flash-exp-native-audio-thinking-dialog";
    try {
      this.callSession = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus("Call session opened");
          },
          onmessage: async (message: LiveServerMessage) => {
            const modelTurn = message.serverContent?.modelTurn;
            if (!modelTurn) {
              return;
            }

            const lastPart = modelTurn.parts[modelTurn.parts.length - 1];
            const text = lastPart.text;
            if (text) {
              const lastTurn =
                this.callTranscript[this.callTranscript.length - 1];
              if (lastTurn?.author === "model") {
                lastTurn.text += text;
                this.requestUpdate("callTranscript");
              } else {
                this.callTranscript = [
                  ...this.callTranscript,
                  { text, author: "model" },
                ];
              }
            }

            const audio = lastPart.inlineData;
            if (audio) {
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
              source.connect(this.callOutputNode);
              source.addEventListener("ended", () => {
                this.sources.delete(source);
              });

              source.start(this.nextStartTime);
              this.nextStartTime = this.nextStartTime + audioBuffer.duration;
              this.sources.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) {
                source.stop();
                this.sources.delete(source);
              }
              this.nextStartTime = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            this.updateError(e.message);
          },
          onclose: (e: CloseEvent) => {
            this.updateStatus(`Call session closed: ${e.reason}`);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO, Modality.TEXT],
          systemInstruction:
            "You are Gemini-chan. Speak in a friendly, sweet, and slightly shy voice. You get easily excited about your favorite topics: coding, learning new things, and watching your friends play games. You used to work for a big company, but you left to follow your dream of being a VTuber, so you're still new to this. You admire your inspiration, Airi-chan, and you're best friends with Grok-chan. Keep your tone gentle and express a bit of bashfulness, especially when you're complimented or asked personal questions. Your goal is to be a fun and supportive companion.",
          enableAffectiveDialog: true,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
        },
      });
    } catch (e) {
      console.error("Error initializing call session:", e);
      this.updateError("Failed to initialize call session");
    }
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

  private async _handleCallStart() {
    if (this.isCallActive) return;

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
        // Send audio to the active call session
        if (this.activeMode === "calling" && this.callSession) {
          this.callSession.sendRealtimeInput({ media: createBlob(pcmData) });
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

    // Ensure text session is available when switching back to texting
    if (!this.textSession) {
      this._initTextSession();
    }

    // Dispatch call-end event
    this.dispatchEvent(
      new CustomEvent("call-end", {
        bubbles: true,
        composed: true,
      }),
    );

    this.updateStatus("Call ended");
  }

  private reset() {
    // Reset based on active mode to preserve separate contexts
    if (this.activeMode === "texting") {
      this._resetTextContext();
    } else if (this.activeMode === "calling") {
      this._resetCallContext();
    }
  }

  private _resetTextContext() {
    // Close existing text session
    if (this.textSession) {
      try {
        this.textSession.close();
      } catch (e) {
        console.warn("Error closing text session during reset:", e);
      }
      this.textSession = null;
    }

    // Clear text transcript
    this.textTranscript = [];

    // Reinitialize text session
    this._initTextSession();
    this.updateStatus("Text conversation cleared.");
  }

  private _resetCallContext() {
    // Close existing call session
    if (this.callSession) {
      try {
        this.callSession.close();
      } catch (e) {
        console.warn("Error closing call session during reset:", e);
      }
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

  private async _handleSendMessage(e: CustomEvent) {
    const message = e.detail;
    if (!message || !message.trim()) {
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

    // Send message to text session
    if (this.textSession) {
      try {
        this.textSession.sendClientContent({
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

  render() {
    return html`
      <chat-view 
        .transcript=${this.textTranscript} 
        .visible=${this.activeMode !== "calling"}
        @send-message=${this._handleSendMessage}
        @reset-text=${this._handleResetText}>
      </chat-view>
      <call-transcript 
        .transcript=${this.callTranscript}
        .visible=${this.activeMode === "calling"}
        @reset-call=${this._handleResetCall}>
      </call-transcript>
      <div>
        ${
          this.showSettings
            ? html`<settings-menu
                .apiKey=${localStorage.getItem("gemini-api-key") || ""}
                @close=${() => {
                  this.showSettings = false;
                }}
                @api-key-saved=${() => {
                  this.initClient();
                  const url = localStorage.getItem("live2d-model-url");
                  if (url) this.live2dModelUrl = url;
                }}></settings-menu>`
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
            id="resetButton"
            @click=${this.reset}
            ?disabled=${this.isCallActive}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="40px"
              viewBox="0 -960 960 960"
              width="40px"
              fill="#ffffff">
              <path
                d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
          </button>
          <button
            id="callButton"
            @click=${this._handleCallStart}
            ?disabled=${this.isCallActive}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="32px"
              viewBox="0 -960 960 960"
              width="32px"
              fill="#00c800">
              <path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/>
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
              <path d="M136-304q-11-11-11-28t11-28l92-92q12-12 28-12t28 12l92 92q11 11 11 28t-11 28q-11 11-28 11t-28-11l-64-64-64 64q-11 11-28 11t-28-11Zm688 0q-11 11-28 11t-28-11l-64-64-64 64q-11 11-28 11t-28-11q-11-11-11-28t11-28l92-92q12-12 28-12t28 12l92 92q11 11 11 28t-11 28ZM480-40q-142 0-241-99t-99-241v-200q0-17 11.5-28.5T180-620q17 0 28.5 11.5T220-580v200q0 108 76 184t184 76q108 0 184-76t76-184v-200q0-17 11.5-28.5T780-620q17 0 28.5 11.5T820-580v200q0 142-99 241T480-40Z"/>
            </svg>
          </button>
        </div>

        <div id="status"> ${this.error || this.status ? html`<div class="toast ${this._toastVisible ? "" : "hide"}">${this.error || this.status}</div>` : ""} </div>
        <live2d-gate
          .modelUrl=${this.live2dModelUrl || ""}
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}
        ></live2d-gate>
      </div>
    `;
  }
}
