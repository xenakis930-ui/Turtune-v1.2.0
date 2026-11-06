/**
 * Genera un WAV PCM silencioso como data URI (solo para modo demo en navegador).
 * Así el reproductor puede "reproducir" sin backend de audio.
 */
export function makeSilentWavDataUri(seconds = 5, sampleRate = 8000) {
  const numSamples = Math.floor(seconds * sampleRate)
  const dataSize = numSamples // 8-bit PCM mono → 1 byte por muestra
  const buffer = new ArrayBuffer(44 + dataSize)
  const v = new DataView(buffer)

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  v.setUint32(4, 36 + dataSize, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  v.setUint32(16, 16, true) // tamaño del chunk fmt
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate, true) // byteRate (8-bit mono)
  v.setUint16(32, 1, true) // blockAlign
  v.setUint16(34, 8, true) // bitsPerSample
  writeStr(36, 'data')
  v.setUint32(40, dataSize, true)
  new Uint8Array(buffer, 44).fill(128) // silencio en 8-bit PCM = 128

  const bytes = new Uint8Array(buffer)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  return 'data:audio/wav;base64,' + btoa(binary)
}
