export const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numChannels = 1 // Force mono for TTS reference
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16
  
  let result: Float32Array
  if (buffer.numberOfChannels === 1) {
    result = buffer.getChannelData(0)
  } else {
    // Mix down to mono
    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)
    result = new Float32Array(left.length)
    for (let i = 0; i < left.length; i++) {
      result[i] = (left[i] + right[i]) / 2
    }
  }

  const dataLength = result.length * 2
  const bufferLength = 44 + dataLength
  const arrayBuffer = new ArrayBuffer(bufferLength)
  const view = new DataView(arrayBuffer)

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  // RIFF identifier
  writeString(view, 0, 'RIFF')
  // file length
  view.setUint32(4, 36 + dataLength, true)
  // RIFF type
  writeString(view, 8, 'WAVE')
  // format chunk identifier
  writeString(view, 12, 'fmt ')
  // format chunk length
  view.setUint32(16, 16, true)
  // sample format (raw)
  view.setUint16(20, format, true)
  // channel count
  view.setUint16(22, numChannels, true)
  // sample rate
  view.setUint32(24, sampleRate, true)
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true)
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true)
  // bits per sample
  view.setUint16(34, bitDepth, true)
  // data chunk identifier
  writeString(view, 36, 'data')
  // data chunk length
  view.setUint32(40, dataLength, true)

  // Write PCM samples
  let offset = 44
  for (let i = 0; i < result.length; i++) {
    const s = Math.max(-1, Math.min(1, result[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }

  return arrayBuffer
}

export const convertBlobToWav = async (blob: Blob): Promise<ArrayBuffer> => {
  const arrayBuffer = await blob.arrayBuffer()
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const audioContext = new AudioContextClass()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  return audioBufferToWav(audioBuffer)
}
