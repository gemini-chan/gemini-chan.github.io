import { vi } from 'vitest'

// Mock GainNode
class MockGainNode {
  connect = vi.fn()
  disconnect = vi.fn()
  gain = { value: 1 }
}

// Mock MediaStreamAudioSourceNode
class MockMediaStreamAudioSourceNode {
  connect = vi.fn()
  disconnect = vi.fn()
}

// Mock AudioContext
class MockAudioContext {
  createGain = vi.fn(() => new MockGainNode())
  createMediaStreamSource = vi.fn(() => new MockMediaStreamAudioSourceNode())
  audioWorklet = {
    addModule: vi.fn(() => Promise.resolve()),
  }
  destination = {}
  resume = vi.fn(() => Promise.resolve())
  suspend = vi.fn(() => Promise.resolve())
  close = vi.fn(() => Promise.resolve())
  sampleRate = 44100
  currentTime = 0
  state = 'running'
}

// Mock global AudioContext
vi.stubGlobal('AudioContext', MockAudioContext)
vi.stubGlobal('webkitAudioContext', MockAudioContext)

// Mock MediaStream
class MockMediaStream {
  getTracks() {
    return []
  }

  getAudioTracks() {
    return []
  }

  getVideoTracks() {
    return []
  }
}

// Mock MediaDevices
if (!global.navigator.mediaDevices) {
  ;(
    global.navigator as unknown as { mediaDevices: MediaDevices }
  ).mediaDevices = {} as MediaDevices
}

;(global.navigator.mediaDevices as MediaDevices).getUserMedia = vi
  .fn()
  .mockImplementation(() => {
    return Promise.resolve(new MockMediaStream())
  })
