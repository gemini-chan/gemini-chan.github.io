/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GdmLiveAudio } from "./main.tsx";
import { createBlob } from "@shared/utils";
import type { CallSessionManager } from "@features/vpu/VPUService";

export class AudioManager {
  mediaStream: MediaStream | null = null;
  sourceNode: MediaStreamAudioSourceNode | null = null;
  scriptProcessorNode: ScriptProcessorNode | null = null;
  public inputAudioContext: AudioContext;
  public outputAudioContext: AudioContext;
  public inputNode: GainNode;
  public outputNode: GainNode;
  public textOutputNode: GainNode;
  public callOutputNode: GainNode;
  public micEnabled: boolean = true;
  public isMuted: boolean = false;

  constructor(private host: GdmLiveAudio, private callSessionManager: CallSessionManager) {
    this.inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    this.inputNode = this.inputAudioContext.createGain();
    this.outputNode = this.outputAudioContext.createGain();
    this.textOutputNode = this.outputAudioContext.createGain();
    this.callOutputNode = this.outputAudioContext.createGain();
  }

  initAudio() {
    // Audio initialization is now handled by individual session managers
    // Each session manager maintains its own isolated audio timeline
  }

  public async startAudioProcessing() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    this.host.updateStatus("");

    // Live2D: greet motion for Sourceress on call start
    this.host._setSourceressMotion("greet");

    // Start idle motion cycling while in call
    this.host._startIdleMotionCycle();

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
      if (!this.host.isCallActive) return;

      const inputBuffer = audioProcessingEvent.inputBuffer;
      const pcmData = inputBuffer.getChannelData(0);
      // Send audio to the active call session using session manager
      if (
        this.host.activeMode === "calling" &&
        this.callSessionManager &&
        this.callSessionManager.isActive
      ) {
        try {
          this.callSessionManager.sendRealtimeInput({
            media: createBlob(pcmData),
          });
        } catch (e) {
          const msg = String((e as Error)?.message || e || "");
          this.host.updateError(`Failed to stream audio: ${msg}`);
        }
      }
    };

    this.sourceNode.connect(this.scriptProcessorNode);
    this.scriptProcessorNode.connect(this.inputAudioContext.destination);
  }

  public stopAudioProcessing() {
    if (this.scriptProcessorNode && this.sourceNode) {
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
  }
}
