/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Blob } from '@google/genai'

export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  wait: number,
  opts?: { leading?: boolean; trailing?: boolean }
): T & { cancel: () => void } {
  const leading = opts?.leading !== false
  const trailing = opts?.trailing === true

  let timeoutId: number | null = null
  let lastRunTime = 0
  let lastArgs: unknown[] | null = null

  function throttled(this: unknown, ...args: unknown[]) {
    const now = Date.now()
    lastArgs = args

    if (!lastRunTime && !leading) {
      lastRunTime = now
    }

    const remaining = wait - (now - lastRunTime)

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      lastRunTime = now
      fn.apply(this, args as Parameters<T>)
    } else if (!timeoutId && trailing) {
      timeoutId = window.setTimeout(() => {
        lastRunTime = Date.now()
        timeoutId = null
        if (lastArgs) {
          fn.apply(this, lastArgs as Parameters<T>)
        }
      }, remaining)
    }
  }

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastRunTime = 0
    lastArgs = null
  }

  return throttled as T & { cancel: () => void }
}

function encode(bytes) {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function decode(base64) {
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

function createBlob(data: Float32Array): Blob {
  const l = data.length
  const int16 = new Int16Array(l)
  for (let i = 0; i < l; i++) {
    // convert float32 -1 to 1 to int16 -32768 to 32767
    int16[i] = data[i] * 32768
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  }
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels,
    sampleRate
  )

  const dataInt16 = new Int16Array(data.buffer)
  const l = dataInt16.length
  const dataFloat32 = new Float32Array(l)
  for (let i = 0; i < l; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0
  }
  // Extract interleaved channels
  if (numChannels === 0) {
    buffer.copyToChannel(dataFloat32, 0)
  } else {
    for (let i = 0; i < numChannels; i++) {
      const channel = dataFloat32.filter(
        (_, index) => index % numChannels === i
      )
      buffer.copyToChannel(channel, i)
    }
  }

  return buffer
}

export { createBlob, decode, decodeAudioData, encode }
