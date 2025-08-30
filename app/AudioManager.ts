/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GdmLiveAudio } from "./main";

export class AudioManager {
  mediaStream: MediaStream | null = null;
  sourceNode: MediaStreamAudioSourceNode | null = null;
  scriptProcessorNode: ScriptProcessorNode | null = null;

  constructor(private host: GdmLiveAudio) {}

  initAudio() {
    // Audio initialization is now handled by individual session managers
    // Each session manager maintains its own isolated audio timeline
  }
}
