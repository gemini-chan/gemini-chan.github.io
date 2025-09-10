import { createComponentLogger } from "@services/DebugLogger";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { AudioToAnimationMapper } from "./audio-mapper";
import { IdleEyeFocus } from "./idle-eye-focus";
import { Live2DMappingService } from "@services/Live2DMappingService";
import type {
  Live2DModelLike,
  PixiApplicationLike,
  PixiDisplayObjectLike,
} from "./types";

const log = createComponentLogger("live2d-model");

declare global {
  interface Window {
    Live2DCubismCore?: unknown;
  }
}

@customElement("live2d-model")
export class Live2DModelComponent extends LitElement {
  private _app?: PixiApplicationLike;
  @property({ attribute: false }) app?: PixiApplicationLike;
  private _model?: Live2DModelLike & { internalModel?: unknown };

  @property({ type: String }) url = "";
  @property({ type: String }) emotion = "neutral";
  @property({ type: String }) motionName = "";
  @property({ type: String }) personaName = "";
  @property({ type: Number }) scale = 1.0;
  @property({ type: Array }) anchor: [number, number] = [0.5, 0.5];
  @property({ type: Boolean }) fitToCanvas = true;
  @property({ type: Number }) containerWidth = 0;
  @property({ type: Number }) containerHeight = 0;
  @property({ type: Number }) xOffset = 0;
  @property({ type: Number }) yOffset = -80;

  // Guarded restart for animation loop after errors
  private _loopRestartDelay = 1000; // ms
  private _loopRestartTimer?: ReturnType<typeof setTimeout>;

  // Ticker callback reference for start/stop control
  private _loopCb?: (delta: number) => void;
  private _lastMotionNameApplied: string = "";
  private _lastLoggedEmotion: string = "";
  private _lastLoggedMappingTag: string = "";
  private _lastParamsAlwaysSignature: string = "";
  private _currentEmotion = "";

  // Audio nodes for future integration
  @property({ attribute: false }) inputNode?: AudioNode;
  @property({ attribute: false }) outputNode?: AudioNode;

  private _mapper?: AudioToAnimationMapper;
  private _idle?: IdleEyeFocus;
  @state() private _loading = false;
  @state() private _error: string | null = null;

  static styles = css`
    :host { display: contents; }
    .overlay { position: absolute; inset: 0; display: grid; place-items: center; color: white; pointer-events: none; font: 14px/1.5 system-ui; }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("pixi-ready", this._onPixiReady as EventListener);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("pixi-ready", this._onPixiReady as EventListener);
    this._destroyModel();
  }

  private _onPixiReady = (ev: CustomEvent<{ app: PixiApplicationLike }>) => {
    log.debug("pixi-ready event received");
    ev.stopPropagation();
    this._app = ev.detail.app;
    this._maybeLoad();
  };

  private _loadingPromise?: Promise<void>;
  private _currentUrl?: string;

  protected updated(changed: Map<string, unknown>) {
    if (changed.has("app") && this.app && !this._app) {
      log.debug("app provided via prop");
      this._app = this.app;
      setTimeout(() => this._maybeLoad(), 0);
    }
    if (changed.has("url")) {
      const oldUrl = changed.get("url") as string;
      const newUrl = this.url;

      // Skip if URL hasn't actually changed
      if (oldUrl === newUrl) {
        log.debug("url change ignored - same URL", { url: newUrl });
        return;
      }

      log.debug("url changed, destroying current model", { oldUrl, newUrl });

      // Cancel any pending load operation
      this._loadingPromise = undefined;
      this._currentUrl = newUrl;

      // Add a delay to ensure cleanup is complete and prevent race conditions
      this._loadingPromise = new Promise<void>((resolve) => {
        setTimeout(async () => {
          // Destroy model asynchronously to prevent change-in-update warnings
          this._destroyModel();

          // Check if URL changed again while we were waiting
          if (this._currentUrl !== newUrl) {
            log.debug("url changed during delay, skipping load", {
              expectedUrl: newUrl,
              currentUrl: this._currentUrl,
            });
            resolve();
            return;
          }

          if (this._loadingPromise === undefined) {
            // Load was cancelled, don't proceed
            log.debug("load was cancelled, skipping");
            resolve();
            return;
          }

          await this._maybeLoad();
          resolve();
        }, 150); // Increased delay to 150ms for better cleanup
      });
    }
    if (changed.has("inputNode") || changed.has("outputNode")) {
      // re-init mapper
      this._initMapper();
    }
    if (changed.has("containerWidth") || changed.has("containerHeight")) {
      this._applyPlacement();
    }
    if (changed.has("emotion")) {
      this.setEmotion(this.emotion);
    }
  }

  protected firstUpdated() {
    if (!this._app) {
      const parentWithApp = (this.parentElement ??
        (this.getRootNode() as { host?: LitElement }).host) as
        | (LitElement & { app?: PixiApplicationLike })
        | undefined;
      const app = parentWithApp?.app;
      if (app) {
        log.debug("got app from parent");
        this._app = app;
        this._maybeLoad();
      } else {
        log.warn("parent app not found at firstUpdated");
      }
    }
  }

  private async _maybeLoad() {
    if (!this._app) return;
    if (!this.url) {
      this._error = "No Live2D model configured.";
      return;
    }
    await this._loadModel(this.url);
    this._startLoop();
  }

  private async _loadModel(url: string) {
    log.debug("loadModel start", { url, currentLoading: this._loading });
    if (!this._app) return;

    // Prevent multiple simultaneous loads
    if (this._loading) {
      log.debug("already loading, skipping duplicate load request");
      return;
    }

    this._loading = true;
    this._error = "";

    try {
      // Ensure Cubism Core is present before importing cubism4
      if (!window.Live2DCubismCore) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src =
            "/assets/js/CubismSdkForWeb-5-r.3/Core/live2dcubismcore.min.js";
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Cubism Core missing"));
          document.head.appendChild(s);
        });
      }

      // Dynamically import Live2D to avoid bundling if unused
      // Configure ZipLoader if available so .zip URLs work
      await import("./zip-loader");
      const mod = await import("pixi-live2d-display/cubism4");
      const Live2DModel = (mod.Live2DModel ??
        mod.default ??
        mod) as unknown as {
        from: (
          url: string,
        ) => Promise<Live2DModelLike & { internalModel?: unknown }>;
      };

      // Retry mechanism with exponential backoff
      const attemptLoad = async (attempt: number): Promise<Live2DModelLike> => {
        try {
          // If URL is a Blob URL or remote .zip, Live2DModel.from should pick up our ZipLoader
          return await Live2DModel.from(url);
        } catch (err) {
          if (attempt >= 3) throw err;
          const delay = 300 * 2 ** attempt; // 300ms, 600ms, 1200ms
          await new Promise((res) => setTimeout(res, delay));
          return attemptLoad(attempt + 1);
        }
      };

      const model: Live2DModelLike = await attemptLoad(0);
      log.debug("model loaded", { model });

      // Extract emotion names from motion groups
      const emotionNames = this._extractEmotionNames(model);

      // Save emotion mapping for this model
      Live2DMappingService.setAvailableEmotions(url, emotionNames);

      // basic transform
      try {
        (
          model.anchor as unknown as { set: (x: number, y: number) => void }
        )?.set?.(this.anchor[0], this.anchor[1]);
      } catch {}
      try {
        (
          model.scale as unknown as { set: (x: number, y: number) => void }
        )?.set?.(this.scale, this.scale);
      } catch {}

      // Placement & scaling (Airi-aligned): bottom-center with fit-to-canvas using container size
      this._applyPlacement(model);

      // add to stage
      this._app.stage.addChild(model as unknown as PixiDisplayObjectLike);
      this._model = model;
      log.debug("added to stage");
      this.dispatchEvent(
        new CustomEvent("live2d-loaded", { bubbles: true, composed: true }),
      );
    } catch (e) {
      log.error("Failed to load Live2D model", { error: e });
      this._error = "Failed to load Live2D model";
      this.dispatchEvent(
        new CustomEvent("live2d-error", {
          detail: { error: String(e?.message || e) },
          bubbles: true,
          composed: true,
        }),
      );
    } finally {
      this._loading = false;
    }
  }


  private _destroyModel() {
    log.debug("destroying model", {
      hasModel: !!this._model,
      hasApp: !!this._app,
    });
    this._stopLoop();
    if (!this._model || !this._app) return;

    try {
      // Remove from stage first
      if (this._app.stage && this._model) {
        this._app.stage.removeChild(
          this._model as unknown as PixiDisplayObjectLike,
        );
        log.debug("model removed from stage");
      }
    } catch (e) {
      log.warn("failed to remove model from stage", { error: e });
    }

    try {
      // Destroy the model to free resources
      if (this._model.destroy) {
        this._model.destroy();
        log.debug("model destroyed");
      }
    } catch (e) {
      log.warn("failed to destroy model", { error: e });
    }

    // Clear reference
    this._model = undefined;
    this._error = "";
    this._loading = false;
    this._currentEmotion = "";
  }

  render() {
    if (this._loading)
      return html`<div class="overlay">Loading Live2D...</div>`;
    return html``;
  }

  private async _initMapper() {
    this._idle = new IdleEyeFocus({
      blinkMin: 2.8,
      blinkMax: 5.8,
      blinkDuration: 0.12,
      saccadeMin: 1.0,
      saccadeMax: 2.4,
      saccadeSpeed: 2.8,
      eyeRange: 0.12,
    });
    this._mapper = new AudioToAnimationMapper({
      inputNode: this.inputNode,
      outputNode: this.outputNode,
      attack: 0.5,
      release: 0.15,
      threshold: 0.04,
      scale: 1.0,
    });
  }

  private _startLoop() {
    let last = performance.now();
    this._stopLoop();
    if (!this._app) return;
    // Ensure mapper exists
    if (!this._mapper) this._initMapper();
    // Ensure idle system exists
    if (!this._idle) {
      /* no-op, created in _initMapper */
    }

    const ticker = this._app.ticker as
      | {
          add: (cb: (delta: number) => void) => void;
          remove: (cb: (delta: number) => void) => void;
          start?: () => void;
          stop?: () => void;
        }
      | undefined;
    if (!ticker) return; // shouldn't happen with PIXI

    const cb = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      this._mapper?.update();
      this._idle?.update(dt);
      const internal = this._model?.internalModel as {
        motionManager?: { startMotion: (group: string, index: number, priority?: number) => void },
        coreModel?: {
          setParameterValueById: (id: string, value: number) => void;
        };
      };
      const mouth = this._mapper?.mouthOpen ?? 0;
      const time = performance.now() / 1000;
      // Set mouth parameter if available (Cubism standard parameter)
      try {
        internal?.coreModel?.setParameterValueById?.("ParamMouthOpenY", mouth);
        internal?.coreModel?.setParameterValueById?.(
          "ParamMouthForm",
          Math.min(1, mouth * 1.2),
        );
        // Apply some subtle idle motion to keep model alive when no audio
        if (mouth < 0.02 && this._idle) {
          // Breathing micro-motion
          const breathe = (Math.sin(time * 1.1) + 1) * 0.025; // 0..0.05
          internal?.coreModel?.setParameterValueById?.(
            "ParamBodyAngleX",
            breathe * 0.6,
          );
          // Eye movement and blink
          internal?.coreModel?.setParameterValueById?.(
            "ParamEyeBallX",
            this._idle.eyeX,
          );
          internal?.coreModel?.setParameterValueById?.(
            "ParamEyeBallY",
            this._idle.eyeY,
          );
          internal?.coreModel?.setParameterValueById?.(
            "ParamEyeLOpen",
            this._idle.eyeOpen,
          );
          internal?.coreModel?.setParameterValueById?.(
            "ParamEyeROpen",
            this._idle.eyeOpen,
          );
        }

        // No persona-based rules anymore; mapping above handles params and motion for the current emotion

        // Trigger motions by name (if provided)
        if (this.motionName && this.motionName !== this._lastMotionNameApplied) {
          const raw = this.motionName.trim();
          const name = raw.toLowerCase();
          // Common motion groups in Cubism: "Idle", "TapBody", but can be custom.
          // We'll map some friendly names to (group, index) for Fern-like rigs.
          const motionMap: Record<string, { group: string; index: number }> = {
            idle1: { group: "Idle", index: 0 },
            idle2: { group: "Idle", index: 1 },
            idle3: { group: "Idle", index: 2 },
            greet: { group: "TapBody", index: 0 },
            tap: { group: "TapBody", index: 0 },
            pose1: { group: "TapBody", index: 1 },
            pose2: { group: "TapBody", index: 2 },
          };
          // Support explicit group:index format
          const colonIdx = raw.indexOf(":");
          let hit: { group: string; index: number } | undefined = undefined;
          if (colonIdx > 0) {
            const group = raw.slice(0, colonIdx);
            const idxNum = Number.parseInt(raw.slice(colonIdx + 1), 10);
            if (!Number.isNaN(idxNum)) hit = { group, index: idxNum };
          }
          if (!hit) hit = motionMap[name];
          if (hit) {
            try {
              log.info('trigger motion', { name: this.motionName, map: hit });
              internal?.motionManager?.startMotion?.(hit.group, hit.index, 2);
              this._lastMotionNameApplied = this.motionName;
            } catch (e) {
              log.warn('startMotion failed', { error: e });
            }
          } else {
            log.debug('no motion mapped', { name });
          }
        }

        switch (this.emotion?.toLowerCase()) {
          case "joy": {
        	const joySin = Math.sin(time * 1.8);
        	internal?.coreModel?.setParameterValueById?.("ParamMouthForm", 0.8);
        	internal?.coreModel?.setParameterValueById?.("ParamCheek", 0.5);
            internal?.coreModel?.setParameterValueById?.(
              "ParamEyeSmile",
              0.6 + (joySin + 1) * 0.2,
            ); // 0.6-1.0
            internal?.coreModel?.setParameterValueById?.(
              "ParamBodyAngleZ",
              joySin * 4,
            );
            break;
          }
          case "sad":
          case "sadness":
            internal?.coreModel?.setParameterValueById?.(
              "ParamMouthForm",
              -0.8,
            );
            internal?.coreModel?.setParameterValueById?.("ParamBrowLY", -0.5);
            internal?.coreModel?.setParameterValueById?.("ParamBrowRY", -0.5);
            // Gloomy face mapping removed; rely on user mapping
            break;
          case "displeased":
            // Gloomy face mapping removed; rely on user mapping
            internal?.coreModel?.setParameterValueById?.(
              "ParamMouthForm",
              -0.5,
            );
            break;
          case "angry":
          case "anger":
            // persona-specific anger mapping removed; rely on user mapping
            internal?.coreModel?.setParameterValueById?.("ParamBrowLY", -0.8);
            internal?.coreModel?.setParameterValueById?.("ParamBrowRY", -0.8);
            internal?.coreModel?.setParameterValueById?.(
              "ParamMouthForm",
              -0.5,
            );
            break;
          case "surprised":
          case "surprise":
            internal?.coreModel?.setParameterValueById?.("ParamEyeLOpen", 1.2);
            internal?.coreModel?.setParameterValueById?.("ParamEyeROpen", 1.2);
            internal?.coreModel?.setParameterValueById?.(
              "ParamMouthOpenY",
              0.7,
            );
            break;
          // No default, so it falls back to idle/speaking animation
          default:
            // Reset Fern-specific expressions when neutral
            internal?.coreModel?.setParameterValueById?.("Param32", 0);
            internal?.coreModel?.setParameterValueById?.("Param34", 0);
            break;
        }
      } catch (err) {
        // Log and halt the animation loop to avoid spamming if model internals error
        log.error("animation update error", { error: err });
        this._stopLoop();
        // Schedule a guarded restart to recover from transient errors
        if (!this._loopRestartTimer) {
          this._loopRestartTimer = setTimeout(() => {
            this._loopRestartTimer = undefined;
            if (this._app && this._model) {
              try {
                this._startLoop();
              } catch (e) {
                log.warn("loop restart failed", { error: e });
              }
            }
          }, this._loopRestartDelay);
        }
      }
    };

    ticker.add(cb);
    this._loopCb = cb;
  }

  private _stopLoop() {
    const ticker = this._app?.ticker;
    if (ticker && this._loopCb)
      (ticker as { remove: (cb: (delta: number) => void) => void }).remove(
        this._loopCb,
      );
    this._loopCb = undefined;
  }

  private _extractEmotionNames(model: Live2DModelLike): string[] {
    // NOTE: This relies on internal properties of the Live2D model from `pixi-live2d-display`.
    // There is no public API to list motion groups. This may break with library updates,
    // so we use careful type guards and bail out safely when shapes differ.
    const internalModel = (model as { internalModel?: unknown }).internalModel;
    const motionManager =
      internalModel && typeof internalModel === 'object' && 'motionManager' in internalModel
        ? (internalModel as { motionManager?: unknown }).motionManager
        : undefined;
    const motionGroups =
      motionManager && typeof motionManager === 'object' && 'motionGroups' in motionManager
        ? (motionManager as { motionGroups?: Record<string, unknown> }).motionGroups
        : undefined;
    if (!motionGroups) return [];
    return Object.keys(motionGroups).filter((name) => name !== 'idle' && name !== 'tap');
  }

  public setEmotion(emotionName: string) {
    if (!this._model || !emotionName) return;
    if (emotionName === this._currentEmotion) return;
    this._currentEmotion = emotionName;

    const internal = this._model?.internalModel as {
      motionManager?: { startMotion: (group: string, index: number, priority?: number) => void },
    };

    try {
      internal?.motionManager?.startMotion?.(emotionName, 0, 3);
    } catch (e) {
      log.warn('setEmotion failed to start motion', { emotion: emotionName, error: e });
    }
  }

  private _applyPlacement(modelArg?: Live2DModelLike) {
    if (!this.fitToCanvas) return;
    const m = modelArg ?? this._model;
    if (!m) return;
    const initialW = m.width || 1;
    const initialH = m.height || 1;
    const cw = this.containerWidth || this._app?.screen?.width || 0;
    const ch = this.containerHeight || this._app?.screen?.height || 0;
    if (!cw || !ch) return;
    try {
      (m.anchor as unknown as { set: (x: number, y: number) => void })?.set?.(
        0.5,
        0.5,
      );
    } catch {}
    const fit = 0.95;
    const offsetFactor = 2.2;
    const heightScale = ((ch * fit) / initialH) * offsetFactor;
    const widthScale = ((cw * fit) / initialW) * offsetFactor;
    const s = Math.min(heightScale, widthScale) * (this.scale || 1.0);
    try {
      (m.scale as unknown as { set: (x: number, y: number) => void })?.set?.(
        s,
        s,
      );
    } catch {}
    try {
      (m.position as unknown as { set: (x: number, y: number) => void })?.set?.(
        cw / 2 + (this.xOffset || 0),
        ch + (this.yOffset || 0),
      );
    } catch {}
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "live2d-model": Live2DModelComponent;
  }
}
