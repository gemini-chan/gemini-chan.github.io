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
  audioWorkletNode: AudioWorkletNode | null = null;
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
    this.textOutputNode.connect(this.outputAudioContext.destination);
    this.callOutputNode.connect(this.outputAudioContext.destination);
  }

  public updateActiveOutputNode() {
    // Update the main outputNode to point to the active session's output node
    if (this.host.activeMode === "texting") {
      this.outputNode = this.textOutputNode;
    } else if (this.host.activeMode === "calling") {
      this.outputNode = this.callOutputNode;
    }
    // Trigger a re-render to pass the updated outputNode to live2d-gate
    this.host._scheduleUpdate();
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

    // Add the audio worklet module
    await this.inputAudioContext.audioWorklet.addModule('app/audio-processor.ts');
    
    // Create the AudioWorkletNode
    this.audioWorkletNode = new AudioWorkletNode(this.inputAudioContext, 'audio-processor');
    
    // Set up message handling from the worklet
    this.audioWorkletNode.port.onmessage = (event) => {
      if (!this.host.isCallActive) return;
      
      const pcmData = event.data;
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

    // Connect the audio nodes
    this.sourceNode.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.inputAudioContext.destination);
  }

  public stopAudioProcessing() {
    if (this.audioWorkletNode && this.sourceNode) {
      this.audioWorkletNode.disconnect();
      this.sourceNode.disconnect();
    }

    this.audioWorkletNode = null;
    this.sourceNode = null;

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }
  }
}
