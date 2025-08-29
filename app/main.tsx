/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PersonaManager } from "@features/persona/PersonaManager";
import { SummarizationService } from "@features/summarization/SummarizationService";
import {
	GoogleGenAI,
	type LiveServerMessage,
	type Session,
} from "@google/genai";
import { createComponentLogger, debugLogger } from "@services/DebugLogger";
import { createBlob } from "@shared/utils";
import { VectorStore } from "@store/VectorStore";
import { LitElement, type PropertyValues, css, html } from "lit";
import type { EmotionMapping } from "@services/Live2DMappingService";
import { customElement, state } from "lit/decorators.js";
import "@live2d/zip-loader";
import "@live2d/live2d-gate";
import "@components/SettingsMenu";
import "@components/ChatView";
import "@components/CallTranscript";
import type { EnergyLevelChangedDetail } from "@services/EnergyBarService";
import { energyBarService } from "@services/EnergyBarService";
import "@components/ToastNotification";
import "@components/ControlsPanel";
import "@components/TabView";
import "@components/CallHistoryView";
import type { ToastNotification } from "@components/ToastNotification";
import { NPUService } from "@features/ai/NPUService";
import { MemoryService } from "@features/memory/MemoryService";
import {
	CallSessionManager,
	TextSessionManager,
} from "@features/vpu/VPUService";
import type { CallSummary, Turn } from "@shared/types";

declare global {
	interface Window {
		webkitAudioContext: typeof AudioContext;
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ExtendedLiveServerMessage extends LiveServerMessage {
	sessionResumptionUpdate?: { resumable: boolean; newHandle: string };
	goAway?: { timeLeft: string };
	serverContent?: LiveServerMessage["serverContent"] & {
		sessionResumptionUpdate?: { resumable: boolean; newHandle: string };
		goAway?: { timeLeft: string };
		generationComplete?: boolean;
	};
}

type ActiveMode = "texting" | "calling" | null;

const logger = createComponentLogger("GdmLiveAudio");

// Import progress event types and mappings
import type {
  BaseProgressEvent,
  NpuProgressEvent,
  VpuProgressEvent,
  NpuEventType,
  VpuEventType
} from "@shared/progress";
import {
  EVENT_STATUS_MAP,
  AUTO_EXPAND_RULES,
  ACTIVE_STATES
} from "@shared/progress";

@customElement("gdm-live-audio")
export class GdmLiveAudio extends LitElement {
	@state() isCallActive = false;
	@state() status = "";
	@state() error = "";
	@state() private _toastVisible = false;
	private ttsCaption = "";
	private ttsCaptionClearTimer: ReturnType<typeof setTimeout> | undefined;
	private _statusHideTimer: ReturnType<typeof setTimeout> | undefined =
		undefined;
	private _statusClearTimer: ReturnType<typeof setTimeout> | undefined =
		undefined;
	@state() showSettings = false;
	@state() toastMessage = "";
	private lastAdvisorContext: string = "";
  @state() private npuThinkingOpen = false;
  @state() private npuThinkingLog: string = "";
  @state() private npuStatus: string = "";
  @state() private thinkingActive = false;
  @state() private npuPersistCollapsed: boolean = false;
  @state() private currentTurnId: string | null = null;
  @state() private isTurnInFlight = false;
  private vpuWaitTimer: number | null = null;
  private _updateScheduled: boolean = false;
  private _npuFirstEventForced = new Set<string>();
  private _vpuFirstEventForced = new Set<string>();
  private vpuTranscriptionChunkCount = 0;
  private vpuTranscriptionLastLog = 0;
  private vpuTranscriptionAgg = new Map<string, { count: number; last: number }>();

	// Track pending user action for API key validation flow
	private pendingAction: (() => void) | null = null;
	
	// Settings
	@state() private showInternalPrompts: boolean = false;
	
	// Metrics
	@state() private npuProcessingTime: number | null = null;
	@state() private vpuProcessingTime: number | null = null;
	private npuStartTime: number | null = null;
	private vpuStartTime: number | null = null;
	@state() private messageStatuses: Record<string, 'clock'|'single'|'double'|'error'> = {};
	@state() private messageRetryCount: Record<string, number> = {};
	
	// Debouncing for vpu:response:transcription events
	private transcriptionDebounceTimer: number | null = null;
	private pendingTranscriptionText: string = "";

	// Clear all thinking UI and timers
	private _clearThinkingAll() {
		// Clear thinking UI
		this._clearThinkingUI();
		
		// Clear timers
		if (this.vpuWaitTimer) {
			clearTimeout(this.vpuWaitTimer);
			this.vpuWaitTimer = null;
		}
		
		if (this.transcriptionDebounceTimer) {
			clearTimeout(this.transcriptionDebounceTimer);
			this.transcriptionDebounceTimer = null;
		}
		
		// Reset transcription state
		this.pendingTranscriptionText = "";
		
		// Reset status and log
		this.npuStatus = "";
		this.npuThinkingLog = "";
		
		// Clear correlation
		this.currentTurnId = null;
		
		// Mark not in-flight
		this.isTurnInFlight = false;
		
		// Prune message metadata maps
		this._pruneMessageMeta();
		
		// Force a re-render to update the UI
		this._scheduleUpdate();
	}
	
	// Helper to auto-expand thinking panel based on persistence setting
	private _autoExpandThinkingPanel() {
		if (!this.npuPersistCollapsed) {
			this.npuThinkingOpen = true;
		}
	}
	
	// Schedule update for frame-based batching with fallback
	private _scheduleUpdate() {
		if (!this._updateScheduled) {
			this._updateScheduled = true;
			let updatePerformed = false;
			
			// Primary update via requestAnimationFrame
			requestAnimationFrame(() => {
				if (this._updateScheduled) {
					this._updateScheduled = false;
					updatePerformed = true;
					logger.debug("UI rAF update");
					this.requestUpdate();
				}
			});
			
			// Fallback timeout to ensure updates happen even when rAF is throttled
			setTimeout(() => {
				if (this._updateScheduled) {
					this._updateScheduled = false;
					if (!updatePerformed) {
						logger.debug("UI timeout update");
						this.requestUpdate();
					}
				}
			}, 50); // 50ms fallback timeout
		}
	}

	// Track current API key for smart change detection
	private currentApiKey = "";

	// Dual-context state management
	@state() activeMode: ActiveMode = null;
	@state() textTranscript: Turn[] = [];
	@state() callTranscript: Turn[] = [];
	@state() textSession: Session | null = null;
	@state() callSession: Session | null = null;
	@state() activeTab: "chat" | "call-history" | "memory" = "chat";
	@state() callHistory: CallSummary[] = [];

	// Session managers
	private textSessionManager: TextSessionManager;
	private callSessionManager: CallSessionManager;
	private summarizationService: SummarizationService;
	private personaManager: PersonaManager;
	private vectorStore: VectorStore;
	memoryService: MemoryService;
	private npuService: NPUService;

	private client: GoogleGenAI;
	private inputAudioContext = new (
		window.AudioContext || window.webkitAudioContext
	)({ sampleRate: 16000 });
	private outputAudioContext = new (
		window.AudioContext || window.webkitAudioContext
	)({ sampleRate: 24000 });
	@state() inputNode = this.inputAudioContext.createGain();
	@state() outputNode = this.outputAudioContext.createGain();

	// Rate-limit UX state for calls
	private _callRateLimitNotified = false;
	// Reconnection toast state to avoid spamming
	private _callReconnectingNotified = false;
	private _textReconnectingNotified = false;

	// Scroll-to-bottom state for call transcript
	@state() private showCallScrollToBottom = false;
	@state() private callNewMessageCount = 0;

	// Scroll-to-bottom state for chat view
	@state() private showChatScrollToBottom = false;
	@state() callState: "idle" | "connecting" | "active" | "ending" = "idle";
	@state() private chatNewMessageCount = 0;
	@state() private isChatActive = false;
	@state() private currentEmotion = "neutral";
	@state() private currentMotionName = "";
	private _idleMotionTimer: number | null = null;
	private emotionAnalysisTimer: number | null = null;
	private memoryDecayTimer: number | null = null;
	@state() private vpuDebugMode = false;
	@state() private npuDebugMode = false;
	// Track last analyzed position in the active transcript for efficient delta analysis
	private lastAnalyzedTranscriptIndex = 0;

	// Audio nodes for each session type
	private textOutputNode = this.outputAudioContext.createGain();
	private callOutputNode = this.outputAudioContext.createGain();

	/**
	 * Optimize re-renders by only updating when necessary
	 */
	protected shouldUpdate(changedProperties: PropertyValues<this>): boolean {
		if (!this.hasUpdated) return true;

		const criticalProps = [
			"activeMode",
			"isCallActive",
			"callState",
			"activeTab",
			"showSettings",
		];
		for (const prop of criticalProps) {
			if (changedProperties.has(prop as keyof GdmLiveAudio)) return true;
		}

		// More robust transcript update check
		const checkTranscript = (
			propName: "textTranscript" | "callTranscript",
		): boolean => {
			if (changedProperties.has(propName)) {
				const oldT = (changedProperties.get(propName) as Turn[]) || [];
				const newT = this[propName] || [];
				if (oldT.length !== newT.length) return true;

				const lastOld = oldT[oldT.length - 1];
				const lastNew = newT[newT.length - 1];
				if (
					!lastOld ||
					!lastNew ||
					lastOld.text !== lastNew.text ||
					lastOld.speaker !== lastNew.speaker ||
					lastOld.isSystemMessage !== lastNew.isSystemMessage
				) {
					return true;
				}
			}
			return false;
		};

		if (
			checkTranscript("textTranscript") ||
			checkTranscript("callTranscript")
		) {
			return true;
		}

		return false;
	}

	private mediaStream: MediaStream;
	private sourceNode: MediaStreamAudioSourceNode;
	private scriptProcessorNode: ScriptProcessorNode;

	static styles = css`
    :host {
      display: block;
      position: relative;
      height: 100vh;
      overflow: hidden;
      color: var(--cp-text);
    }

    .live2d-container {
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    .ui-grid {
      display: grid;
      grid-template-columns: 400px 1fr 400px;
      height: 100%;
      position: relative;
      z-index: 1;
    }



    .main-container {
      z-index: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      opacity: 1;
      visibility: visible;
      transition: opacity 200ms ease, visibility 200ms ease;
    }

    .main-container.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
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
		this.personaManager = new PersonaManager();
		// MemoryService will be initialized after the GoogleGenAI client is created
		
		// Load persisted collapsed state from localStorage
		try {
			const savedCollapsed = localStorage.getItem('npuPersistCollapsed');
			if (savedCollapsed !== null) {
				this.npuPersistCollapsed = JSON.parse(savedCollapsed);
			}
		} catch (error) {
			// If there's an error parsing, default to false
			console.warn('Failed to parse npuPersistCollapsed from localStorage:', error);
			this.npuPersistCollapsed = false;
		}
		
		this.initClient();

		// Debug: Check initial TTS energy state
		logger.debug("Initial TTS energy state", {
			level: energyBarService.getCurrentEnergyLevel("tts"),
			model: energyBarService.getCurrentModel("tts"),
		});

		// Initial TTS greeting is now triggered in firstUpdated
	}

	protected override firstUpdated(changedProperties: PropertyValues): void {
		super.firstUpdated(changedProperties);
		
		// Handle Live2D test events from settings
		this.addEventListener('live2d-test-emotion', (e: Event) => {
			const ce = e as CustomEvent<{ emotion: string; mapping: EmotionMapping }>;
			const { emotion, mapping } = ce.detail || { emotion: 'neutral', mapping: {} as EmotionMapping };
			logger.debug('live2d-test-emotion', { emotion, mapping });
			// UI-driven emotion disabled; rely on NPU-inferred emotions in advisor_context
			if (mapping.motion) {
				// For manual test, forward motion name as group:index to be mapped downstream if desired
				this.currentMotionName = `${mapping.motion.group}:${mapping.motion.index}`;
				setTimeout(() => { this.currentMotionName = ""; }, 200);
			}
		});
		// Trigger initial TTS greeting once the UI is ready
		this._triggerInitialTTSGreeting();
	}

	private _triggerInitialTTSGreeting() {
		const ttsLevel = energyBarService.getCurrentEnergyLevel("tts");
		const personaName = this.personaManager.getActivePersona().name;

		logger.debug("Triggering initial TTS greeting", { ttsLevel, personaName });

		if (ttsLevel === 2) {
			const prompt = this.personaManager.getPromptForEnergyLevel(
				2,
				personaName,
				"tts",
			);

			logger.debug("Generated initial TTS greeting", { prompt });

			if (prompt) {
				this._appendTextMessage(prompt, "model");
				logger.debug("Injected initial greeting into chat");
			}
		}
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
				this._handleTextRateLimit.bind(this),
				this._handleTtsCaptionUpdate.bind(this),
				this._handleTtsTurnComplete.bind(this),
				this.personaManager,
				this,
			);
			this.callSessionManager = new CallSessionManager(
				this.outputAudioContext,
				this.callOutputNode,
				this.client,
				this.updateStatus.bind(this),
				this.updateError.bind(this),
				this._handleCallRateLimit.bind(this),
				this.updateCallTranscript.bind(this),
				this.personaManager,
				this,
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

		// Initialize VectorStore with the GoogleGenAI client for embedding support
		this.vectorStore = new VectorStore(
			this.personaManager.getActivePersona().id,
		);

		// Initialize VectorStore with AI client for embeddings
		this.vectorStore.setAIClient(this.client, "gemini-embedding-001");

		// Initialize MemoryService with the GoogleGenAI client
		this.memoryService = new MemoryService(this.vectorStore, this.client);

		// Initialize NPU Service for memory-augmented prompt formulation
		this.npuService = new NPUService(this.client, this.memoryService);

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
		this._scheduleUpdate();
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
			this._handleCallRateLimit();
		}
	}
private updateTextTranscript(text: string) {
// This function is now only for LIVE updates to the model's last message.
// The official, final message is added to the transcript in _handleTtsTurnComplete.
if (this.textTranscript.length > 0) {
const lastMessage = this.textTranscript[this.textTranscript.length - 1];
if (lastMessage.speaker === "model") {
	// If the last message was from the model, update it
	// Create a new array to ensure Lit detects the change
	const updatedTranscript = [...this.textTranscript];
	updatedTranscript[updatedTranscript.length - 1] = {
		...lastMessage,
		text: text,
	};
	this.textTranscript = updatedTranscript;
}
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
		const notice = {
			text,
			speaker: "model" as const,
			timestamp: new Date(),
			isSystemMessage: true,
		};
		this.callTranscript = [...this.callTranscript, notice];
	}

	private _appendTextMessage(
		text: string,
		speaker: "user" | "model",
		isSystemMessage = false,
	) {
		// Append a message directly to the text transcript
		logger.debug("Appending text message", {
			text,
			speaker,
			isSystemMessage,
			currentLength: this.textTranscript.length,
		});

		this.textTranscript = [
			...this.textTranscript,
			{ text, speaker, isSystemMessage },
		];

		logger.debug("Text message appended", {
			newLength: this.textTranscript.length,
			lastMessage: this.textTranscript[this.textTranscript.length - 1],
		});

		// Force a re-render to ensure the UI updates
		this._scheduleUpdate();
	}

	private _handleCallRateLimit() {
		// Degrade only STS energy and notify UI
		energyBarService.handleRateLimitError("sts");
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

	private _handleTextRateLimit() {
		// Degrade only TTS energy on text rate-limit
		energyBarService.handleRateLimitError("tts");

		const toast = this.shadowRoot?.querySelector(
			"toast-notification#inline-toast",
		) as ToastNotification;
		toast?.show("Rate limit reached. Please wait a moment.", "warning", 3000);
	}

  private _isSourceressActive(): boolean {
    const name = this.personaManager.getActivePersona().name || "";
    return name.toLowerCase().includes("sourceress");
  }

  private _setSourceressMotion(name: string) {
    logger.debug('set-motion', { name });
    if (!this._isSourceressActive()) return;
    this.currentMotionName = name;
    // Reset back to empty after a short delay to allow re-triggering the same motion later
    setTimeout(() => {
      if (this.currentMotionName === name) this.currentMotionName = "";
      this._scheduleUpdate();
    }, 200);
  }

  private _triggerSparkle(durationMs = 1200) {
    logger.debug('sparkle', { durationMs });
    if (!this._isSourceressActive()) return;
    // UI-driven emotion disabled; rely on NPU-inferred emotions in advisor_context
    // const prev = this.currentEmotion;
    // this.currentEmotion = "sparkle";
    // setTimeout(() => {
    //   if (this.currentEmotion === "sparkle") this.currentEmotion = prev;
    //   this.requestUpdate();
    // }, durationMs);
  }

	private async _handleCallStart() {
		// On new call session, reset STS energy
		energyBarService.resetEnergyLevel("session-reset", "sts");
		if (this.isCallActive) return;

		// PRE-FLIGHT CHECK: Verify STS energy before proceeding
		const stsEnergy = energyBarService.getCurrentEnergyLevel("sts");
		if (stsEnergy === 0) {
			this.updateStatus("Energy exhausted — call unavailable.");
			const toast = this.shadowRoot?.querySelector(
				"toast-notification#inline-toast",
			) as ToastNotification;
			toast?.show("Cannot start call: energy exhausted.", "error", 3000, {
				position: "bottom-right",
				variant: "standard",
			});
			return;
		}

		// Check API key presence before proceeding
		if (!this._checkApiKeyExists()) {
			this._showApiKeyPrompt(() => this._handleCallStart());
			return;
		}

		logger.debug("Call start. Existing callSession:", this.callSession);
		// Switch to calling mode
		this.activeMode = "calling";
		// When switching to calling mode, reset delta index so we analyze from the start of the call transcript
		this.lastAnalyzedTranscriptIndex = 0;
		this.callState = "connecting";
		this._updateActiveOutputNode();

		const isResuming = this.callSessionManager.getResumptionHandle() !== null;
		const ok = await this._initCallSession();
		if (!ok || !this.callSession) {
			// If energy is exhausted, reflect a different UX than rate limit
			const exhausted = energyBarService.getCurrentEnergyLevel() === 0;
			if (exhausted) {
				this.updateStatus("Energy exhausted — please try again later.");
			} else {
				this._handleCallRateLimit();
				this.updateStatus(
					"Unable to start call (rate limited or network error)",
				);
			}
			return;
		}

		// After successful session init, show toast
		const toast = this.shadowRoot?.querySelector(
			"toast-notification#inline-toast",
		) as ToastNotification;
		if (isResuming) {
			toast?.show("Resumed previous call session", "success", 1200, {
				position: "bottom-right",
				variant: "standard",
			});
		} else {
			this.callTranscript = []; // Clear transcript only for new sessions
			toast?.show("Started a new call session", "success", 1500, {
				position: "bottom-right",
				variant: "standard",
			});
		}

		this.inputAudioContext.resume();
		this.updateStatus("Starting call...");

		try {
			this.mediaStream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false,
			});

			this.updateStatus("");
			this.callState = "active";

			// Live2D: greet motion for Sourceress on call start
			this._setSourceressMotion("greet");

			// Start idle motion cycling while in call
			this._startIdleMotionCycle();

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
				if (
					this.activeMode === "calling" &&
					this.callSessionManager &&
					this.callSessionManager.isActive
				) {
					try {
						this.callSessionManager.sendRealtimeInput({
							media: createBlob(pcmData),
						});
					} catch (e) {
						const msg = String((e as Error)?.message || e || "");
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

	private _startIdleMotionCycle(intervalMs = 25000) {
		logger.debug('idle-cycle:start', { intervalMs });
		if (this._idleMotionTimer) {
			clearTimeout(this._idleMotionTimer);
			this._idleMotionTimer = null;
		}
		if (!this._isSourceressActive()) return;
		const choices = ["idle1", "idle2", "idle3"];
		let i = 0;
		const step = () => {
			logger.debug('idle-cycle:step', { isCallActive: this.isCallActive, activeMode: this.activeMode });
			if (!this.isCallActive || this.activeMode !== "calling") return;
			this._setSourceressMotion(choices[i % choices.length]);
			i++;
			this._idleMotionTimer = window.setTimeout(step, intervalMs);
		};
		this._idleMotionTimer = window.setTimeout(step, 1500); // initial delay after greet
	}

	private async _handleCallEnd() {
		if (!this.isCallActive && !this.mediaStream && !this.inputAudioContext)
			return;

		this.updateStatus("");
		this.callState = "ending";

		this.isCallActive = false;

		// Stop idle motion cycle
		if (this._idleMotionTimer) {
			clearTimeout(this._idleMotionTimer);
			this._idleMotionTimer = null;
		}
		this.currentMotionName = "";

		if (this.scriptProcessorNode && this.sourceNode && this.inputAudioContext) {
			this.scriptProcessorNode.disconnect();
			this.sourceNode.disconnect();
		}

		this.scriptProcessorNode = null;
		this.sourceNode = null;

		if (this.mediaStream) {
			for (const track of this.mediaStream.getTracks()) {
				track.stop();
			}
			this.mediaStream = null;
		}

		// Switch back to texting mode
		this.activeMode = "texting";
		// Reset index when switching back to texting mode; next analysis will start fresh on text transcript
		this.lastAnalyzedTranscriptIndex = 0;
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

		this.updateStatus("");
		this.callState = "idle";
		logger.debug("Call ended. callSession preserved:", this.callSession);
	}

	private _resetTextContext() {
		// Reset the delta-analysis index for text transcript
		this.lastAnalyzedTranscriptIndex = 0;
		// Close existing text session using session manager
		if (this.textSessionManager) {
			this.textSessionManager.closeSession();
			this.textSession = null;
		}

		// Clear text transcript
		this.textTranscript = [];
		this.lastAnalyzedTranscriptIndex = 0;

		// Clear thinking UI and timers
		this._clearThinkingAll();

		// Text session will be lazily initialized when user sends next message
		this.updateStatus("Text conversation cleared.");
	}
private _handleTtsCaptionUpdate(text: string) {
// Clear any pending timer to clear the caption
if (this.ttsCaptionClearTimer) {
clearTimeout(this.ttsCaptionClearTimer);
this.ttsCaptionClearTimer = undefined;
}

// When a new caption update arrives, it means a new turn has begun.
// Add a new, empty model message to the transcript that we can append to.
if (!this.ttsCaption) {
this._appendTextMessage("", "model");
}

this.ttsCaption += text;

// Update our new empty model message with the latest caption text
this.updateTextTranscript(this.ttsCaption);
}
	private _handleTtsTurnComplete() {
		// Store the completed turn in memory
		if (this.ttsCaption.trim()) {
			const lastUserTurn = this.textTranscript
				.slice()
				.reverse()
				.find((t) => t.speaker === "user");

			if (lastUserTurn) {
				const conversationContext = `user: ${lastUserTurn.text}\nmodel: ${this.ttsCaption.trim()}`;
				const personaId = this.personaManager.getActivePersona().id;
				// Extract and store facts from the conversation context asynchronously
				// Pass advisor context into memory extraction so Flash Lite can enrich facts with emotional flavor
				this.memoryService
					.extractAndStoreFacts(conversationContext, personaId, this.lastAdvisorContext)
					.catch((error) => {
						logger.error("Failed to extract and store facts in background", { error });
					});
			}
		}

		// Set a timer to hide the caption toast and clear the caption text
		this.ttsCaptionClearTimer = setTimeout(() => {
			const toast = this.shadowRoot?.querySelector(
				"toast-notification#inline-toast",
			) as ToastNotification;
			toast?.hide();
			this.ttsCaption = "";
			this.ttsCaptionClearTimer = undefined;
		}, 2500); // Keep caption on screen for 2.5s after speech ends
	}

	private _resetCallContext() {
		// Reset the delta-analysis index for call transcript
		this.lastAnalyzedTranscriptIndex = 0;
		// Also clear the persisted resumption handle so the next call starts fresh
		try {
			this.callSessionManager?.clearResumptionHandle();
		} catch (e) {
			logger.warn("Failed to clear call session resumption handle:", e);
		}
		// Reset reconnection toast guard
		this._callReconnectingNotified = false;
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

		// Clear thinking UI and timers
		this._clearThinkingAll();

		// Reinitialize call session if we're currently in a call
		if (this.isCallActive) {
			this._initCallSession();
		}
		this.updateStatus("Call conversation cleared.");
		// Reuse the existing call-start toasts when the next call starts (resume-first flow).
		// No additional toast here to avoid redundancy.
	}

	private _toggleSettings() {
		this.showSettings = !this.showSettings;
	}

	private _checkApiKeyExists(): boolean {
		const apiKey = localStorage.getItem("gemini-api-key");
		return apiKey !== null && apiKey.trim() !== "";
	}

	private _getApiKeyPrompt(): string {
		const activePersona = this.personaManager.getActivePersona();
		if (activePersona.name === "Assistant") {
			return "Please provide your API key from AI Studio to proceed with the task.";
		}
		if (activePersona.name === "VTuber") {
			return "P-please tell me ur API key from AI Studio 👉🏻👈🏻";
		}
		if (activePersona.name === "Sourceress") {
			return "Hii~ ✨ To wake my magic, I need your Google AI API key from AI Studio. Pop it into Settings and I’ll sparkle to life!";
		}
		// Generic prompt for custom personas
		return "Please provide your API key from AI Studio to continue.";
	}

	private _showApiKeyPrompt(pendingAction?: () => void) {
		// Store the pending action to execute after API key is saved
		this.pendingAction = pendingAction || null;

		// Open settings menu and show toast prompting for API key
		this.showSettings = true;
		const globalToast = this.shadowRoot?.querySelector(
			"#global-toast",
		) as ToastNotification;
		globalToast?.show(this._getApiKeyPrompt(), "info", 4000, {
			position: "top-right",
		});
	}

	private async _handleApiKeySaved() {
		// Show success toast for API key saved
		const globalToast = this.shadowRoot?.querySelector(
			"#global-toast",
		) as ToastNotification;
		globalToast?.show("API key saved successfully! ✨", "success", 2500, {
			position: "top-right",
		});

		logger.info("API key saved, reinitializing client");

		// Reinitialize the client with the new API key
		await this.initClient();

		// Close settings menu and toast when API key is saved
		this.showSettings = false;

		// Execute the pending action if there is one
		if (this.pendingAction) {
			const action = this.pendingAction;
			this.pendingAction = null; // Clear the pending action

			// Execute the action now that the client is initialized
			action();
		}
	}

	private _handleApiKeyChanged() {
		// Get the new API key from localStorage
		const newApiKey = localStorage.getItem("gemini-api-key") || "";

		// Smart change detection - avoid unnecessary reinitialization
		if (newApiKey === this.currentApiKey) {
			logger.debug(
				"API key unchanged, skipping reinitialization:",
				newApiKey ? `***${newApiKey.slice(-4)}` : "empty",
			);
			return; // Silently skip - no toast needed
		}

		// Show toast notification for API key change
		const toast = this.shadowRoot?.querySelector(
			"toast-notification",
		) as ToastNotification;
		if (toast) {
			if (newApiKey) {
				toast.show("API key updated successfully! ✨", "info", 3000);
			} else {
				toast.show("API key cleared", "info", 3000);
			}
		}

		logger.info("API key changed, reinitializing client");

		// Reinitialize the client with the new API key
		this.initClient();
	}

	private _handleModelUrlChanged() {
		// This method is now handled by persona changes
		// Live2D model URL changes are managed through the PersonaManager
		logger.debug("Model URL change handled via persona system");

		// Trigger a re-render to update the Live2D component with the new persona's model URL
		this.requestUpdate();
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
		logger.error("[Model URL Error]", { errorMessage });

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
		logger.error("[Live2D Error]", { errorMessage });

		// Show error toast notification
		const toast = this.shadowRoot?.querySelector(
			"toast-notification",
		) as ToastNotification;
		if (toast) {
			toast.show(`Live2D model failed to load: ${errorMessage}`, "error", 5000);
		}
	}

	private async _handlePersonaChanged() {
		// Clear thinking UI and timers before changing persona
		this._clearThinkingAll();

		const activePersona = this.personaManager.getActivePersona();
		if (activePersona) {
			// Check if vectorStore is initialized before calling switchPersona
			if (this.vectorStore) {
				await this.vectorStore.switchPersona(activePersona.id);
			}

			// Disconnect the active TextSessionManager to apply the new system prompt
			if (this.textSessionManager) {
				await this.textSessionManager.closeSession();
				this.textSessionManager.clearResumptionHandle(); // Clear session token
				this.textSession = null;
			}
			// Also disconnect the call session to ensure it picks up the new persona
			if (this.callSessionManager) {
				await this.callSessionManager.closeSession();
				this.callSessionManager.clearResumptionHandle(); // Clear session token
				this.callSession = null;
			}
			this.textTranscript = [];

			// Reset energy levels to full for the new persona
			energyBarService.resetEnergyLevel("session-reset", "sts");
			energyBarService.resetEnergyLevel("session-reset", "tts");

			const toast = this.shadowRoot?.querySelector(
				"toast-notification",
			) as ToastNotification;
			if (toast) {
				toast.show(
					`Switched to ${activePersona.name}. Loading model...`,
					"info",
					4000,
				);
			}

			// Trigger a re-render to update the Live2D component with the new persona's model URL
			this.requestUpdate();
		}
	}

	private _handleTabSwitch(e: CustomEvent) {
		this.activeTab = e.detail.tab;
	}

	private _handleVpuDebugToggle(e: CustomEvent) {
		this.vpuDebugMode = e.detail.enabled;
		const toast = this.shadowRoot?.querySelector(
			"toast-notification#inline-toast",
		) as ToastNotification;
		toast?.show(
			`VPU Debug Mode ${this.vpuDebugMode ? "Enabled" : "Disabled"}`,
			"info",
			2000,
		);
	}
	
	private _handleNpuDebugToggle(e: CustomEvent) {
		this.npuDebugMode = e.detail.enabled;
		const toast = this.shadowRoot?.querySelector(
			"toast-notification#inline-toast",
		) as ToastNotification;
		toast?.show(
			`NPU Debug Mode ${this.npuDebugMode ? "Enabled" : "Disabled"}`,
			"info",
			2000,
		);
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

	private async _startTtsFromSummary(e: CustomEvent) {
		const summary = e.detail.summary as CallSummary;
		const message = `Tell me more about our call regarding "${summary.summary}"`;

		// Check API key presence before proceeding. If the key is missing, this
		// method will be re-invoked after the key is provided via the pendingAction
		// mechanism.
		if (!this._checkApiKeyExists()) {
			const action = () => this._startTtsFromSummary(e);
			this._showApiKeyPrompt(action);
			return;
		}

		// Immediately switch to the chat tab to provide user feedback
		this.activeTab = "chat";

		// Clear the previous text chat context. This clears the transcript and
		// ensures we start with a fresh session.
		this._resetTextContext();

    // Generate turn ID before appending user message
    const turnId = crypto?.randomUUID?.() ?? `t-${Date.now()}`;
    
    // Add the summary prompt as the first "user" message in the new conversation with turnId
    this.textTranscript = [
      ...this.textTranscript,
      { text: message, speaker: "user", turnId }
    ];
    
    // Initialize status to clock (analyzing)
    this.messageStatuses = { ...this.messageStatuses, [turnId]: 'clock' };
    
    // Prune message metadata maps
    this._pruneMessageMeta();
    
    // Set initial thinking state BEFORE any awaits
    this.npuThinkingLog = "";
    this.npuStatus = "Thinking…";
    this.thinkingActive = true;
    this.npuThinkingOpen = this.npuPersistCollapsed ? false : true;
    this.requestUpdate();
    await this.updateComplete;
    
    logger.debug("UI INIT: Thinking set pre-await", { status: this.npuStatus, open: this.npuThinkingOpen, active: this.thinkingActive });

		// A new session must be initialized. Show status while this happens.
		this.updateStatus("Initializing text session...");
		const ok = await this._initTextSession();

		// If session initialization fails, show an error and abort.
		if (!ok || !this.textSessionManager || !this.textSessionManager.isActive) {
			this.updateError(
				"Unable to start text session (rate limited or network error)",
			);
			return;
		}

		// With an active session, use unified NPU flow to prepare context and send.
		this.lastAdvisorContext = "";
		const personaId = this.personaManager.getActivePersona().id;
		/* conversationContext removed: memory now stores facts only */
    // Initial thinking state already set above
    // Set current turn ID to ensure only this turn drives the Thinking UI
    this.currentTurnId = turnId;
    const intention = await this.npuService.analyzeAndAdvise(
      message,
      personaId,
      this.textTranscript,
      undefined,
      undefined,
      turnId,
      (ev: NpuProgressEvent) => {
        // Ignore events for other turns
        if (this.currentTurnId && ev.data?.turnId && this.currentTurnId !== ev.data.turnId) {
          return;
        }
        
        // Force immediate update on first NPU event for this turn
        const turnId = ev.data?.turnId || this.currentTurnId;
        if (turnId && !this._npuFirstEventForced.has(turnId)) {
          this._npuFirstEventForced.add(turnId);
          logger.debug("UI FORCE: first NPU event", { turnId, type: ev.type });
          this.requestUpdate();
        }
        
        // Log events based on debug mode
        if (this.npuDebugMode || ev.type !== 'npu:prompt:partial') {
          logger.debug("NPU Progress Event", ev);
        }
        
        // Map event to status string using switch statement
        switch (ev.type) {
          case "npu:start":
            this.npuStatus = EVENT_STATUS_MAP[ev.type];
            // Start timing
            this.npuStartTime = Date.now();
            break;
          case "npu:model:start":
            this.npuStatus = "Preparing NPU…";
            if (ev.data?.model) {
              this.messageStatuses = { ...this.messageStatuses, [turnId]: 'single' };
              // Initialize retry count
              this.messageRetryCount = { ...this.messageRetryCount, [turnId]: 0 };
            }
            break;
          case "npu:model:attempt":
            this.npuStatus = "Calling NPU…";
            if (ev.data?.attempt) {
              // Update retry count (attempt 1 = 0 retries, attempt 2 = 1 retry, etc.)
              const retries = Math.max(0, (ev.data.attempt as number) - 1);
              this.messageRetryCount = { ...this.messageRetryCount, [turnId]: Math.max(this.messageRetryCount[turnId] ?? 0, retries) };
            }
            break;
          case "npu:model:error":
            if (ev.data?.attempt && ev.data?.error) {
              this.npuStatus = `NPU error (attempt ${ev.data.attempt}): ${ev.data.error}`;
              this.messageStatuses = { ...this.messageStatuses, [turnId]: 'error' };
              // Clear any pending transcription timers on error
              if (this.transcriptionDebounceTimer) {
                clearTimeout(this.transcriptionDebounceTimer);
                this.transcriptionDebounceTimer = null;
                this.pendingTranscriptionText = "";
              }
              // Calculate processing time on error
              if (this.npuStartTime) {
                this.npuProcessingTime = Date.now() - this.npuStartTime;
                this.npuStartTime = null;
              }
            }
            break;
          case "npu:model:response":
            this.npuStatus = "NPU ready";
            if (ev.data?.length) {
              this.messageStatuses = { ...this.messageStatuses, [turnId]: 'double' };
            }
            break;
          case "npu:complete":
            this.npuStatus = EVENT_STATUS_MAP[ev.type];
            // Calculate processing time on completion
            if (this.npuStartTime) {
              this.npuProcessingTime = Date.now() - this.npuStartTime;
              this.npuStartTime = null;
            }
            // Set fallback status based on whether NPU produced a response
            const ok = !!ev.data?.hasResponseText;
            this.messageStatuses = { ...this.messageStatuses, [turnId]: ok ? 'double' : 'error' };
            break;
          default:
            if (EVENT_STATUS_MAP[ev.type]) {
              this.npuStatus = EVENT_STATUS_MAP[ev.type];
            }
            break;
        }
        
        // Handle auto-expand rules
        if (AUTO_EXPAND_RULES.has(ev.type)) {
          this._autoExpandThinkingPanel();
        }
        
        // Handle prompt partial updates
        if (ev.type === "npu:prompt:partial" && ev.data?.delta) {
          if (this.npuThinkingOpen) {
            this.npuThinkingLog += ev.data.delta;
          }
          // Do not auto-expand for partial updates
        }
        
        // Handle prompt built with optional full prompt display
        if (ev.type === "npu:prompt:built" && ev.data?.fullPrompt) {
          // Optionally, keep partial stream; or replace with full prompt
          if (this.showInternalPrompts) {
            this.npuThinkingLog = ev.data.fullPrompt as string;
          }
        }
        
        // Handle completion
        if (ev.type === "npu:complete") {
          // Auto-collapse after complete
          this.npuThinkingOpen = false;
        }
        
        // Schedule update for frame-based batching
        this._scheduleUpdate();
      }
    );
		// Removed usage of intention.emotion as it's no longer part of the interface
		this.lastAdvisorContext = intention?.advisor_context || "";

		// The advisory prompt is now the user's direct input, so the debug message is redundant.

		this.textSessionManager.sendMessage(`${intention?.advisor_context ? intention.advisor_context + "\n\n" : ""}${message}`, turnId, (ev: VpuProgressEvent) => {
			this._handleVpuProgress(ev, turnId);
		});
	}

	private _scrollCallTranscriptToBottom() {
		// Find the call transcript component and scroll it to bottom
		const callTranscript = this.shadowRoot?.querySelector("call-transcript") as
			| (HTMLElement & { scrollToBottom?: () => void })
			| null;
		if (callTranscript?.scrollToBottom) {
			callTranscript.scrollToBottom();
			// Reset the scroll state
			this.showCallScrollToBottom = false;
			this.callNewMessageCount = 0;
		}
	}

	private _scrollChatToBottom() {
		const chatView = this.shadowRoot?.querySelector("chat-view") as
			| (HTMLElement & { _scrollToBottom?: () => void })
			| null;
		if (chatView?._scrollToBottom) {
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

	private _handleChatActiveChanged(e: CustomEvent) {
		this.isChatActive = e.detail.isChatActive;
	}
	
	// Handle debounced transcription updates
	private _handleDebouncedTranscription(text: string) {
		// Accumulate text until debounce period expires
		this.pendingTranscriptionText += text;
		
		// Clear existing timer
		if (this.transcriptionDebounceTimer) {
			clearTimeout(this.transcriptionDebounceTimer);
		}
		
		// Set new timer
		this.transcriptionDebounceTimer = window.setTimeout(() => {
			// Update the thinking log with accumulated text
			if (this.pendingTranscriptionText) {
				this.npuThinkingLog += `\n[model]: ${this.pendingTranscriptionText}`;
				this.pendingTranscriptionText = "";
				// Force a re-render to update the UI
				this._scheduleUpdate();
			}
			this.transcriptionDebounceTimer = null;
		}, 150); // 150ms debounce
	}
	
	// Clear thinking UI
	private _clearThinkingUI() {
		this.npuStatus = "";
		this.npuThinkingLog = "";
		// Force a re-render to update the UI
		this._scheduleUpdate();
	}
	
	private async _handleSendMessage(e: CustomEvent) {

    const userExpanded = this.npuThinkingOpen;
		const message = e.detail;
		if (!message || !message.trim()) {
			return;
		}

    // Generate turn ID before appending user message
    const turnId = crypto?.randomUUID?.() ?? `t-${Date.now()}`;
    
    // Add message to text transcript with turnId
    this.textTranscript = [
      ...this.textTranscript,
      { text: message, speaker: "user", turnId }
    ];
    
    // Initialize status to clock (analyzing)
    this.messageStatuses = { ...this.messageStatuses, [turnId]: 'clock' };
    
    // Prune message metadata maps
    this._pruneMessageMeta();
    
    // Set initial thinking state BEFORE any awaits
    this.npuThinkingLog = "";
    this.npuStatus = "Thinking…";
    this.thinkingActive = true;
    // Respect persisted collapse; otherwise, keep current open state
    this.npuThinkingOpen = this.npuPersistCollapsed ? false : true;
    // Flush synchronously
    this.requestUpdate();
    await this.updateComplete;
    
    logger.debug("UI INIT: Thinking set pre-await", { status: this.npuStatus, open: this.npuThinkingOpen, active: this.thinkingActive });

		// Check API key presence before proceeding
		if (!this._checkApiKeyExists()) {
			this._showApiKeyPrompt(() => this._handleSendMessage(e));
			return;
		}

		// Clear any existing captions when the user sends a new message
		this.ttsCaption = "";
		const toast = this.shadowRoot?.querySelector(
			"toast-notification#inline-toast",
		) as ToastNotification;
		toast?.hide();
		if (this.ttsCaptionClearTimer) {
			clearTimeout(this.ttsCaptionClearTimer);
			this.ttsCaptionClearTimer = undefined;
		}

		// Ensure we have an active text session
		if (!this.textSessionManager || !this.textSessionManager.isActive) {
			this.updateStatus("Initializing text session...");
			const ok = await this._initTextSession();
			if (!ok || !this.textSession) {
				this.updateError(
					"Unable to start text session (rate limited or network error)",
				);
				return;
			}
		}

		// Send message to text session using NPU-VPU flow (memory-augmented)
		if (this.textSessionManager?.isActive) {
			try {
				// Use the turn ID we already generated
				this.currentTurnId = turnId;
				
				// Unified NPU flow: analyze emotion + prepare enhanced prompt in one step
				this.lastAdvisorContext = "";
				const personaId = this.personaManager.getActivePersona().id;
				/* conversationContext removed: memory now stores facts only */
				// Initial thinking state already set above
        const intention = await this.npuService.analyzeAndAdvise(
					message,
					personaId,
					this.textTranscript,
					undefined,
          undefined,
          turnId,
          (ev: NpuProgressEvent) => {
           // Ignore events for other turns
           if (this.currentTurnId && ev.data?.turnId && this.currentTurnId !== ev.data.turnId) {
             return;
           }
           
           // Force immediate update on first NPU event for this turn
           const turnId = ev.data?.turnId || this.currentTurnId;
           if (turnId && !this._npuFirstEventForced.has(turnId)) {
             this._npuFirstEventForced.add(turnId);
             logger.debug("UI FORCE: first NPU event", { turnId, type: ev.type });
             this.requestUpdate();
           }
           
           // Clean up first event tracking after completion
           if (ev.type === "npu:complete") {
             if (turnId) {
               this._npuFirstEventForced.delete(turnId);
             }
           }
           
           // Log events based on debug mode
           if (this.npuDebugMode || ev.type !== 'npu:prompt:partial') {
             logger.debug("NPU Progress Event", ev);
           }
           
           // Log events based on debug mode
           if (this.npuDebugMode || ev.type !== 'npu:prompt:partial') {
             logger.debug("NPU Progress Event", ev);
           }
           
           // Map event to status string using switch statement
           switch (ev.type) {
             case "npu:start":
               this.npuStatus = EVENT_STATUS_MAP[ev.type];
               this.thinkingActive = true;
               // Start timing
               this.npuStartTime = Date.now();
               this.npuThinkingLog += "\n[Thinking...]"; // Concise log line
               break;
             case "npu:model:start":
               this.npuStatus = "Preparing NPU…";
               this.thinkingActive = true;
               if (ev.data?.model) {
                 this.messageStatuses = { ...this.messageStatuses, [turnId]: 'single' };
                 // Initialize retry count
                 this.messageRetryCount = { ...this.messageRetryCount, [turnId]: 0 };
                 this.npuThinkingLog += `\n[Preparing NPU: ${ev.data.model}]`; // Concise log line
               }
               break;
             case "npu:model:attempt":
               this.npuStatus = "Calling NPU…";
               this.thinkingActive = true;
               if (ev.data?.attempt) {
                 // Update retry count (attempt 1 = 0 retries, attempt 2 = 1 retry, etc.)
                 const retries = Math.max(0, (ev.data.attempt as number) - 1);
                 this.messageRetryCount = { ...this.messageRetryCount, [turnId]: Math.max(this.messageRetryCount[turnId] ?? 0, retries) };
                 this.npuThinkingLog += `\n[NPU attempt #${ev.data.attempt}]`; // Concise log line
               }
               break;
             case "npu:model:error":
               if (ev.data?.attempt && ev.data?.error) {
                 this.npuStatus = `NPU error (attempt ${ev.data.attempt}): ${ev.data.error}`;
                 this.thinkingActive = false;
                 this.messageStatuses = { ...this.messageStatuses, [turnId]: 'error' };
                 // Clear any pending transcription timers on error
                 if (this.transcriptionDebounceTimer) {
                   clearTimeout(this.transcriptionDebounceTimer);
                   this.transcriptionDebounceTimer = null;
                   this.pendingTranscriptionText = "";
                 }
                 // Calculate processing time on error
                 if (this.npuStartTime) {
                   this.npuProcessingTime = Date.now() - this.npuStartTime;
                   this.npuStartTime = null;
                 }
                 this.npuThinkingLog += `\n[NPU error (attempt ${ev.data.attempt}): ${ev.data.error}]`; // Concise log line
               }
               break;
             case "npu:model:response":
               this.npuStatus = "NPU ready";
               this.thinkingActive = true;
               if (ev.data?.length) {
                 this.messageStatuses = { ...this.messageStatuses, [turnId]: 'double' };
                 this.npuThinkingLog += "\n[NPU ready]"; // Concise log line
               }
               break;
             case "npu:complete":
               this.npuStatus = EVENT_STATUS_MAP[ev.type];
               this.thinkingActive = false;
               // Calculate processing time on completion
               if (this.npuStartTime) {
                 this.npuProcessingTime = Date.now() - this.npuStartTime;
                 this.npuStartTime = null;
               }
               // Set fallback status based on whether NPU produced a response
               const ok = !!ev.data?.hasResponseText;
               this.messageStatuses = { ...this.messageStatuses, [turnId]: ok ? 'double' : 'error' };
               this.npuThinkingLog += "\n[Thinking complete]"; // Concise log line
               break;
             default:
               if (EVENT_STATUS_MAP[ev.type]) {
                 this.npuStatus = EVENT_STATUS_MAP[ev.type];
                 // Set thinking active for other active states
                 if (ACTIVE_STATES.has(ev.type as any)) {
                   this.thinkingActive = true;
                 }
               }
               break;
           }
           
           // Handle auto-expand rules
           if (AUTO_EXPAND_RULES.has(ev.type)) {
             if (userExpanded) {
               this._autoExpandThinkingPanel();
             }
           }
           
           // Handle prompt partial updates
           if (ev.type === "npu:prompt:partial" && ev.data?.delta) {
             if (this.npuThinkingOpen) {
               this.npuThinkingLog += ev.data.delta;
             }
             // Do not auto-expand for partial updates
           }
           
           // Handle memory events
           if (ev.type === "npu:memories:start") {
             this.npuThinkingLog += "\n[Retrieving memories...]"; // Concise log line
           } else if (ev.type === "npu:memories:done") {
             this.npuThinkingLog += "\n[Memories retrieved]"; // Concise log line
           }
           
           // Handle prompt build events
           if (ev.type === "npu:prompt:build") {
             this.npuThinkingLog += "\n[Building prompt...]"; // Concise log line
           } else if (ev.type === "npu:prompt:built") {
             this.npuThinkingLog += "\n[Prompt built]"; // Concise log line
           }
           
           // Handle advisor ready event
           if (ev.type === "npu:advisor:ready") {
             this.npuThinkingLog += "\n[NPU context ready]"; // Concise log line
           }
           
           // Handle prompt built with optional full prompt display
           if (ev.type === "npu:prompt:built" && ev.data?.fullPrompt) {
             // Optionally, keep partial stream; or replace with full prompt
             if (this.showInternalPrompts) {
               this.npuThinkingLog = ev.data.fullPrompt as string;
             }
           }
           
           // Handle completion
           if (ev.type === "npu:complete") {
             // Auto-collapse after complete, but only if user hadn't manually expanded
             if (!userExpanded) this.npuThinkingOpen = false;
           }
           
           // Schedule update for frame-based batching
           this._scheduleUpdate();
         }
				);
        
        // Clean up first event tracking after completion
        if (ev.type === "npu:complete") {
          if (turnId) {
            this._npuFirstEventForced.delete(turnId);
          }
        }
				// Removed usage of intention.emotion as it's no longer part of the interface
				this.lastAdvisorContext = intention?.advisor_context || "";

				// NPU advisor ready — now sending to VPU
				// Note: We don't set npuStatus here anymore as it's handled by the advisor:ready event
				// this.npuStatus = "Sending to VPU…";
				
				this.textSessionManager.sendMessage(`${intention?.advisor_context ? intention.advisor_context + "\n\n" : ""}${message}`, turnId, (ev: VpuProgressEvent) => {
					this._handleVpuProgress(ev, turnId, false);
				});
			} catch (error) {
				logger.error("Error sending message to text session (unified flow):", {
					error,
				});
				const msg = String((error as Error)?.message || error || "");
				this.updateError(`Failed to send message: ${msg}`);

				// Try to reinitialize the session and resend once.
				const ok = await this._initTextSession();
				if (ok && this.textSessionManager?.isActive) {
					try {
						// Create turn ID for correlation
						const turnId = crypto?.randomUUID?.() ?? `t-${Date.now()}`;
						this.currentTurnId = turnId;
						
						this.lastAdvisorContext = "";
						const personaId = this.personaManager.getActivePersona().id;
						/* conversationContext removed: memory now stores facts only */
						const intention = await this.npuService.analyzeAndAdvise(
							message,
							personaId,
							this.textTranscript,
							undefined,
              undefined,
              turnId,
						);
						// Removed usage of intention.emotion as it's no longer part of the interface
						this.lastAdvisorContext = intention?.advisor_context || "";

						// The advisory prompt is now the user's direct input, so the debug message is redundant.
						this.textSessionManager.sendMessage(`${intention?.advisor_context ? intention.advisor_context + "\n\n" : ""}${message}`, turnId, (ev: VpuProgressEvent) => {
							this._handleVpuProgress(ev, turnId, true);
						});
					} catch (retryError) {
						logger.error("Failed to send message on retry:", { retryError });
						this.updateError(
							`Failed to send message on retry: ${
								(retryError as Error).message
							}`,
						);
						// Mark turn as complete on retry failure
						this.isTurnInFlight = false;
					}
				}
			}
		} else {
			this.updateError("Text session not available");
		}
	}

	private _handleVpuProgress(ev: VpuProgressEvent, turnId?: string, isRetry = false) {
		// Ignore events for other turns
		if (this.currentTurnId && turnId && ev.data?.turnId && this.currentTurnId !== ev.data.turnId) {
			return;
		}
		
		// Force immediate update on first VPU event for this turn
		const eventTurnId = ev.data?.turnId || turnId;
		if (eventTurnId && !this._vpuFirstEventForced.has(eventTurnId)) {
			this._vpuFirstEventForced.add(eventTurnId);
			logger.debug("UI FORCE: first VPU event", { turnId: eventTurnId, type: ev.type });
			this.requestUpdate();
		}
		
		// Clean up first event tracking after completion or error
		if (ev.type === "vpu:response:complete" || ev.type === "vpu:message:error") {
			if (eventTurnId) {
				this._vpuFirstEventForced.delete(eventTurnId);
			}
		}

		// Log the event for debugging only if not a transcription chunk or in debug mode
		if (ev.type !== 'vpu:response:transcription' || this.vpuDebugMode) {
			logger.debug("VPU Progress Event", { isRetry, ...ev });
		}

		// Handle fallback timer for "Waiting for response..."
		if (ev.type === "vpu:message:sending") {
			// Clear any existing timer
			if (this.vpuWaitTimer) {
				clearTimeout(this.vpuWaitTimer);
				this.vpuWaitTimer = null;
			}
			// Set new timer
			if (!turnId || this.currentTurnId === turnId) {
				this.vpuWaitTimer = window.setTimeout(() => {
					if (!turnId || this.currentTurnId === turnId) {
						this.npuStatus = "Waiting for response…";
					}
					this.vpuWaitTimer = null;
				}, 800);
			}
		} else if (ev.type === "vpu:response:first-output" || ev.type === "vpu:response:transcription") {
			// Clear the fallback timer when we get first output
			if (this.vpuWaitTimer) {
				clearTimeout(this.vpuWaitTimer);
				this.vpuWaitTimer = null;
			}
		} else if (ev.type === "vpu:response:complete" || ev.type === "vpu:message:error") {
			// Clear the fallback timer on completion or error
			if (this.vpuWaitTimer) {
				clearTimeout(this.vpuWaitTimer);
				this.vpuWaitTimer = null;
			}
			// Clear transcription state
			if (this.transcriptionDebounceTimer) {
				clearTimeout(this.transcriptionDebounceTimer);
				this.transcriptionDebounceTimer = null;
				this.pendingTranscriptionText = "";
			}
			// Reset transcription chunk counters on completion or error
			this.vpuTranscriptionChunkCount = 0;
			this.vpuTranscriptionLastLog = 0;
		}

		// Map event to status string
		if (EVENT_STATUS_MAP[ev.type]) {
			this.npuStatus = EVENT_STATUS_MAP[ev.type];
			// Add data details for specific events
			if (ev.type === "vpu:message:sending") {
				// Start timing
				this.vpuStartTime = Date.now();
				// Initialize transcription log time
				if (this.vpuTranscriptionLastLog === 0) {
					this.vpuTranscriptionLastLog = Date.now();
				}
			} else if (ev.type === "vpu:message:error" && ev.data?.error) {
				this.npuStatus = `VPU error${isRetry ? ' (retry)' : ''}: ${ev.data.error}`;
			} else if (ev.type === "vpu:response:complete") {
				// Calculate processing time on completion
				if (this.vpuStartTime) {
					this.vpuProcessingTime = Date.now() - this.vpuStartTime;
					this.vpuStartTime = null;
				}
			}
		}

		// Handle log updates and status overrides
		switch (ev.type) {
			case "vpu:message:sending":
				this.npuStatus = isRetry ? "Sending to VPU (retry)…" : "Sending to VPU…";
				this.thinkingActive = true;
				this.npuThinkingLog += isRetry ? "\n[Sending message to VPU (retry)]" : "\n[Sending message to VPU]";
				break;
			case "vpu:message:error":
				if (ev.data?.error) {
					this.npuStatus = `VPU error${isRetry ? ' (retry)' : ''}: ${ev.data.error}`;
					this.thinkingActive = false;
					this.npuThinkingLog += `\n[VPU Error${isRetry ? ' (retry)' : ''}: ${ev.data.error}]`;
					// Reset transcription aggregation for this turn on error
					if (ev.data?.turnId) {
						this.vpuTranscriptionAgg.delete(ev.data.turnId);
					} else {
						this.vpuTranscriptionAgg.delete('global');
					}
				}
				break;
			case "vpu:response:first-output":
				this.npuStatus = isRetry ? "Receiving response from VPU (retry)…" : "Receiving response from VPU…";
				this.thinkingActive = true;
				this.npuThinkingLog += isRetry ? "\n[VPU first output received (retry)]" : "\n[VPU first output received]";
				break;
			case "vpu:response:transcription":
				this.npuStatus = isRetry ? "Receiving response from VPU (retry)…" : "Receiving response from VPU…";
				this.thinkingActive = true;
				if (ev.data?.text) {
					// Use debounced transcription updates
					this._handleDebouncedTranscription(ev.data.text as string);
					
					// Per-turn transcription aggregation
					const turnKey = ev.data?.turnId ?? 'global';
					if (!this.vpuTranscriptionAgg.has(turnKey)) {
						this.vpuTranscriptionAgg.set(turnKey, { count: 0, last: 0 });
					}
					const agg = this.vpuTranscriptionAgg.get(turnKey)!;
					agg.count++;
					const now = Date.now();
					if (agg.last === 0) {
						agg.last = now;
					}
					if (now - agg.last > 1000) {
						logger.debug(`VPU received ${agg.count} transcription chunks for turn ${turnKey} in the last second.`);
						agg.count = 0;
						agg.last = now;
					}
				}
				break;
			case "vpu:response:complete":
				this.npuStatus = isRetry ? "Response complete (retry)" : "Done";
				this.thinkingActive = false;
				this.npuThinkingLog += isRetry ? "\n[VPU response complete (retry)]" : "\n[VPU response complete]";
				// Reset transcription aggregation for this turn on completion
				if (ev.data?.turnId) {
					this.vpuTranscriptionAgg.delete(ev.data.turnId);
				} else {
					this.vpuTranscriptionAgg.delete('global');
				}
				// Reset transcription chunk counters on completion
				this.vpuTranscriptionChunkCount = 0;
				this.vpuTranscriptionLastLog = 0;
				break;
		}
		
		// Schedule update for frame-based batching
		this._scheduleUpdate();
	}

	/**
	 * Log component updates for debugging UI refresh issues
	 */
	protected override updated(changedProperties: PropertyValues<this>): void {
		super.updated(changedProperties);
		
		logger.debug("UPDATED", {
			thinkingStatus: this.npuStatus,
			thinkingActive: this.thinkingActive,
			open: this.npuThinkingOpen,
			logLen: this.npuThinkingLog.length,
			transcriptLen: this.textTranscript.length
		});
	}

	connectedCallback() {
		// Subscribe to energy level changes to surface persona-specific prompts
		energyBarService.addEventListener(
			"energy-level-changed",
			this._onEnergyLevelChanged as EventListener,
		);
		super.connectedCallback();
		window.addEventListener(
			"persona-changed",
			this._handlePersonaChanged.bind(this),
		);
		this.addEventListener("reconnecting", this._handleReconnecting);
		this.addEventListener("reconnected", this._handleReconnected);
		
		// Set default throttles
		debugLogger.setThrottle('*', 250, { leading: true, trailing: false });
		debugLogger.setThrottle('ChatView', 1000, { leading: true, trailing: false });
		debugLogger.setThrottle('transcript-auto-scroll', 1000, { leading: true, trailing: false });
		debugLogger.setThrottle('call-transcript', 1000, { leading: true, trailing: false });
		
		this.startEmotionAnalysis();
	}

	disconnectedCallback() {
		energyBarService.removeEventListener(
			"energy-level-changed",
			this._onEnergyLevelChanged as EventListener,
		);
		super.disconnectedCallback();
		window.removeEventListener(
			"persona-changed",
			this._handlePersonaChanged.bind(this),
		);
		this.removeEventListener("reconnecting", this._handleReconnecting);
		this.removeEventListener("reconnected", this._handleReconnected);
		this.stopEmotionAnalysis();
	}

	private _pruneMessageMeta() {
		// Create a set of current user turn IDs
		const currentUserTurnIds = new Set(
			this.textTranscript
				.filter(turn => turn.speaker === "user" && turn.turnId)
				.map(turn => turn.turnId)
		);
		
		// Filter messageStatuses and messageRetryCount to only include current turn IDs
		const prunedStatuses: Record<string, 'clock'|'single'|'double'|'error'> = {};
		const prunedRetryCount: Record<string, number> = {};
		
		for (const turnId of currentUserTurnIds) {
			if (turnId && this.messageStatuses[turnId]) {
				prunedStatuses[turnId] = this.messageStatuses[turnId];
			}
			if (turnId && this.messageRetryCount[turnId] !== undefined) {
				prunedRetryCount[turnId] = this.messageRetryCount[turnId];
			}
		}
		
		this.messageStatuses = prunedStatuses;
		this.messageRetryCount = prunedRetryCount;
	}
	
	private startEmotionAnalysis() {
		this.stopEmotionAnalysis(); // Ensure no multiple timers
		this.emotionAnalysisTimer = window.setInterval(async () => {
			// Only run analysis if a call is active or a text chat is active
			if (!this.isCallActive && !this.isChatActive) {
				return;
			}

			if (!this.npuService) return;


			const transcript =
				this.activeMode === "calling"
					? this.callTranscript
					: this.textTranscript;

			// Analyze only new transcript parts since the last analysis
			const newTurns = transcript.slice(this.lastAnalyzedTranscriptIndex);
			if (newTurns.length === 0) {
				return; // Nothing new to analyze
			}

			// Get model emotion from MemoryService
			const modelEmotion = this.memoryService?.getLastModelEmotion?.() || "neutral";
			if (modelEmotion !== this.currentEmotion) {
				this.currentEmotion = modelEmotion;
				logger.debug("Updated model emotion", { emotion: modelEmotion });
				
				// Dispatch event to update Live2D model
				this.dispatchEvent(new CustomEvent('model-emotion-change', {
					detail: { emotion: modelEmotion },
					bubbles: true,
					composed: true
				}));
			}

			// Update the index to the full length after processing
			this.lastAnalyzedTranscriptIndex = transcript.length;
		}, 10000); // Analyze every 10 seconds to stay within RPM limits
		
		// Start memory decay timer
		this._startMemoryDecay();
	}

	private stopEmotionAnalysis() {
		if (this.emotionAnalysisTimer) {
			window.clearInterval(this.emotionAnalysisTimer);
			this.emotionAnalysisTimer = null;
		}
		if (this.memoryDecayTimer) {
			window.clearInterval(this.memoryDecayTimer);
			this.memoryDecayTimer = null;
		}
	}
	
	private _startMemoryDecay() {
		if (this.memoryDecayTimer) return; // Already running

		// Apply memory decay every 10 minutes
		this.memoryDecayTimer = window.setInterval(() => {
			if (this.memoryService) {
				this.memoryService.applyTimeDecay().catch((error) => {
					logger.error("Failed to apply memory decay", { error });
				});
			}
		}, 10 * 60 * 1000); // 10 minutes
	}

	private _handleReconnecting = () => {
		const toast = this.shadowRoot?.querySelector(
			"toast-notification#inline-toast",
		) as ToastNotification;
		if (this.activeMode === "calling" && !this._callReconnectingNotified) {
			this._callReconnectingNotified = true;
			toast?.show("Reconnecting call…", "info", 2000, {
				position: "bottom-right",
				variant: "standard",
			});
		} else if (
			this.activeMode === "texting" &&
			!this._textReconnectingNotified
		) {
			this._textReconnectingNotified = true;
			toast?.show("Reconnecting chat…", "info", 2000, {
				position: "bottom-center",
				variant: "inline",
			});
		}
	};

	private _handleReconnected = () => {
		const toast = this.shadowRoot?.querySelector(
			"toast-notification#inline-toast",
		) as ToastNotification;
		if (this.activeMode === "calling") {
			toast?.show("Call reconnected", "success", 1200, {
				position: "bottom-right",
				variant: "standard",
			});
			this._callReconnectingNotified = false;
		} else if (this.activeMode === "texting") {
			toast?.show("Chat reconnected", "success", 1200, {
				position: "bottom-center",
				variant: "inline",
			});
			this._textReconnectingNotified = false;
		}
	};

	private _onEnergyLevelChanged = (e: Event) => {
		const { level, reason, mode } = (e as CustomEvent<EnergyLevelChangedDetail>)
			.detail;

		// Debug logging
		logger.debug("Energy level changed", { mode, level, reason });

		if (level < 3) {
			const personaName = this.personaManager.getActivePersona().name;
			// STS: show immersive prompts as directed; TTS: inject into chat or show as toast
			const prompt = this.personaManager.getPromptForEnergyLevel(
				level as 0 | 1 | 2 | 3,
				personaName,
				mode,
			);

			logger.debug("Generated prompt for energy level", {
				mode,
				level,
				personaName,
				prompt,
			});

			if (prompt && mode === "sts") {
				this._appendCallNotice(prompt);
				logger.debug("Appended STS call notice", { prompt });
			} else if (prompt && mode === "tts" && level < 2) {
				// Only inject prompts for degraded/exhausted states.
				this._appendTextMessage(prompt, "model");
				logger.debug("Appended TTS text message", { prompt });
			}
		}

		// Handle fallback when energy drops to non-resumable models (STS level 1, TTS level 1)
		if ((mode === "sts" && level === 1) || (mode === "tts" && level === 1)) {
			// Trigger fallback handling
			logger.debug("Triggering fallback for", { mode, level });

			// For STS (call session), handle fallback if we're in a call
			if (
				mode === "sts" &&
				this.activeMode === "calling" &&
				this.callTranscript.length > 0
			) {
				this.callSessionManager
					.handleFallback(this.callTranscript, this.summarizationService)
					.catch((error) => {
						logger.error("Error handling fallback for call session", { error });
					});
			}

			// For TTS (text session), handle fallback if we have text transcript
			if (mode === "tts" && this.textTranscript.length > 0) {
				this.textSessionManager
					.handleFallback(this.textTranscript, this.summarizationService)
					.catch((error) => {
						logger.error("Error handling fallback for text session", { error });
					});
			}
		}

		// If we are in an active call and rate-limited, reconnect with the downgraded model
		if (
			this.activeMode === "calling" &&
			this.isCallActive &&
			reason === "rate-limit-exceeded" &&
			mode === "sts"
		) {
			this.updateStatus("Rate limited — switching to a lower tier...");
			// Re-initialize the call session to apply the downgraded model
			this._initCallSession();
		}
	};

	render() {
		return html`
      <div class="live2d-container">
        <live2d-gate
          .modelUrl=${this.personaManager.getActivePersona().live2dModelUrl || ""}
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}
          .emotion=${this.currentEmotion}
          .motionName=${this.currentMotionName}
          .personaName=${this.personaManager.getActivePersona().name}
          @live2d-loaded=${this._handleLive2dLoaded}
          @live2d-error=${this._handleLive2dError}
        ></live2d-gate>
      </div>
      <div class="ui-grid">

        <div class="main-container ${this.activeMode === "calling" ? "hidden" : ""}">
          <tab-view
            .activeTab=${this.activeTab}
            .visible=${this.activeMode !== "calling"}
            @tab-switch=${this._handleTabSwitch}
          ></tab-view>
          ${
						this.activeTab === "chat"
							? html`
                <chat-view
                  .transcript=${this.textTranscript}
                  .visible=${this.activeMode !== "calling"}
                  .thinkingStatus=${this.npuStatus}
                  .thinkingText=${this.npuThinkingLog}
                  .thinkingOpen=${this.npuThinkingOpen}
                  .thinkingActive=${this.thinkingActive}
                  .npuProcessingTime=${this.npuProcessingTime}
                  .vpuProcessingTime=${this.vpuProcessingTime}
                  .messageStatuses=${this.messageStatuses}
                  .messageRetryCount=${this.messageRetryCount}
                  @send-message=${this._handleSendMessage}
                  @reset-text=${this._resetTextContext}
                  @scroll-state-changed=${this._handleChatScrollStateChanged}
                  @chat-active-changed=${this._handleChatActiveChanged}
                  @thinking-open-changed=${(e: CustomEvent) => {
                    this.npuThinkingOpen = e.detail.open;
                    if (!e.detail.open) {
                      this.npuPersistCollapsed = true;
                      // Save to localStorage
                      try {
                        localStorage.setItem('npuPersistCollapsed', JSON.stringify(true));
                      } catch (error) {
                        // Ignore storage errors
                        console.warn('Failed to save npuPersistCollapsed to localStorage:', error);
                      }
                    }
                  }}
                >
                </chat-view>
              `
							: this.activeTab === "call-history"
								? html`
                <call-history-view
                  .callHistory=${this.callHistory}
                  @start-tts-from-summary=${this._startTtsFromSummary}
                >
                </call-history-view>
              `
								: html`
                <memory-view
                  .memoryService=${this.memoryService}
                  @vpu-debug-toggle=${this._handleVpuDebugToggle}
                  @npu-debug-toggle=${this._handleNpuDebugToggle}
                ></memory-view>
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
                  @persona-changed=${this._handlePersonaChanged}
                ></settings-menu>`
							: ""
					}
          <controls-panel
            .isCallActive=${this.isCallActive}
            .isChatActive=${this.isChatActive}
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

          <toast-notification id="inline-toast" position="bottom-center" variant="inline"></toast-notification>
          <toast-notification id="global-toast" position="top-right"></toast-notification>
        </div>

        <call-transcript
          .transcript=${this.callTranscript}
          .visible=${this.activeMode === "calling"}
          .activePersonaName=${this.personaManager.getActivePersona().name}
          .callState=${this.callState}
          @reset-call=${this._resetCallContext}
          @scroll-state-changed=${this._handleCallScrollStateChanged}
        ></call-transcript>
      </div>
    `;
	}
}
