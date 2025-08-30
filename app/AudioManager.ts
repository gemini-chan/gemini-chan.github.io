/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createBlob } from "@shared/utils";
import type { CallSessionManager } from "@features/vpu/VPUService";

export interface AudioManagerDependencies {
	getCallSessionManager: () => CallSessionManager;
	getState: () => {
		activeMode: "texting" | "calling" | null;
		isCallActive: boolean;
	};
	updateStatus: (msg: string) => void;
	updateError: (msg: string) => void;
	scheduleUpdate: () => void;
	setSourceressMotion: (name: string) => void;
	startIdleMotionCycle: () => void;
}

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

	constructor(private deps: AudioManagerDependencies) {
		this.inputAudioContext = new (window.AudioContext ||
			window.webkitAudioContext)({ sampleRate: 16000 });
		this.outputAudioContext = new (window.AudioContext ||
			window.webkitAudioContext)({ sampleRate: 24000 });
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
  const { activeMode } = this.deps.getState();
  // Update the main outputNode to point to the active session's output node
  if (activeMode === "texting") {
   this.outputNode = this.textOutputNode;
  } else if (activeMode === "calling") {
   this.outputNode = this.callOutputNode;
  }
  // Trigger a re-render to pass the updated outputNode to live2d-gate
  this.deps.scheduleUpdate();
 }

 public async acquireMicrophone() {
  if (this.mediaStream) {
   return;
  }
  this.mediaStream = await navigator.mediaDevices.getUserMedia({
   audio: true,
   video: false,
  });
 }

 public async startAudioProcessing() {
  if (!this.mediaStream) {
   throw new Error(
    "Media stream has not been acquired. Call acquireMicrophone first.",
   );
  }
 
  this.deps.updateStatus("");
 
  // Live2D: greet motion for Sourceress on call start
  this.deps.setSourceressMotion("greet");
 
  // Start idle motion cycling while in call
  this.deps.startIdleMotionCycle();
 
  // Wait for the call session to become active before processing audio
  const sessionManager = this.deps.getCallSessionManager();
 
  try {
    await sessionManager.sessionReady;
  } catch (e) {
    this.deps.updateError("Call session failed to become ready in time.");
    return;
  }
 
  this.sourceNode = this.inputAudioContext.createMediaStreamSource(
   this.mediaStream,
  );
  this.sourceNode.connect(this.inputNode);
 
  // Add the audio worklet module
  await this.inputAudioContext.audioWorklet.addModule(
   new URL("./audio-processor.ts", import.meta.url).href,
  );
 
  // Create the AudioWorkletNode
  this.audioWorkletNode = new AudioWorkletNode(
   this.inputAudioContext,
   "audio-processor",
  );
 
  // Set up message handling from the worklet
  this.audioWorkletNode.port.onmessage = (event) => {
   const { isCallActive, activeMode } = this.deps.getState();
   const callSessionManager = this.deps.getCallSessionManager();
 
   if (
    !isCallActive ||
    activeMode !== "calling" ||
    !callSessionManager?.isActive
   ) {
    return;
   }
 
   const pcmData = event.data;
   try {
    callSessionManager.sendRealtimeInput({
     media: createBlob(pcmData),
    });
   } catch (e) {
    const msg = String((e as Error)?.message || e || "");
    this.deps.updateError(`Failed to stream audio: ${msg}`);
   }
  };
 
  // Connect the audio nodes
  this.sourceNode.connect(this.audioWorkletNode);
  // Do not connect the worklet to the destination, as it's for processing, not playback.
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
