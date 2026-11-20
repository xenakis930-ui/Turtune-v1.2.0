/**
 * equalizer.js — Ecualizador gráfico de 7 bandas vía Web Audio API.
 * Frecuencias estándar: 60, 170, 310, 600, 1000, 3000, 6000 Hz.
 */
let ctx = null
let source = null
let filters = [] // array of BiquadFilterNode
let gain = null
let connected = false
let enabled = false

// 7 bandas estándar
const BAND_FREQS = [60, 170, 310, 600, 1000, 3000, 6000]
const BAND_LABELS = ['60', '170', '310', '600', '1k', '3k', '6k']
const NUM_BANDS = BAND_FREQS.length

// Presets (7 valores, uno por banda, en dB)
const PRESETS = {
  flat:        [0, 0, 0, 0, 0, 0, 0],
  rock:        [4, 3, -1, -2, 1, 3, 4],
  pop:         [1, 2, 1, 0, 1, 2, 2],
  jazz:        [3, 1, 0, 1, -1, 2, 3],
  classical:   [3, 2, 0, 0, 0, 2, 3],
  bass:        [6, 4, 1, -1, -2, -1, 0],
  vocal:       [-2, -1, 0, 2, 4, 2, 0],
  electronic:  [4, 2, 0, -1, 1, 3, 4],
  acoustic:    [3, 2, 1, 0, 1, 2, 2],
  loudness:    [4, 2, 0, 0, 0, 2, 4],
}

export const EQ_PRESETS = PRESETS
export const EQ_BAND_FREQS = BAND_FREQS
export const EQ_BAND_LABELS = BAND_LABELS
export const EQ_NUM_BANDS = NUM_BANDS

export function initEqualizer(audioEl) {
  if (connected || !audioEl) return
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    ctx = new AudioContext()

    source = ctx.createMediaElementSource(audioEl)

    filters = BAND_FREQS.map((freq, i) => {
      const f = ctx.createBiquadFilter()
      if (i === 0) {
        f.type = 'lowshelf'
        f.frequency.value = freq
      } else if (i === NUM_BANDS - 1) {
        f.type = 'highshelf'
        f.frequency.value = freq
      } else {
        f.type = 'peaking'
        f.frequency.value = freq
        f.Q.value = 1.4
      }
      f.gain.value = 0
      return f
    })

    gain = ctx.createGain()
    gain.gain.value = 1

    // Cadena: source → f0 → f1 → ... → fN → gain → destination
    source.connect(filters[0])
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1])
    }
    filters[filters.length - 1].connect(gain)
    gain.connect(ctx.destination)

    connected = true
  } catch (err) {
    console.warn('[turtune:eq] no se pudo inicializar el ecualizador:', err?.message ?? err)
  }
}

export function resumeEqualizer() {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

export function setEqualizerEnabled(on) {
  enabled = !!on
  if (!connected) return
  if (!on) {
    // Flat: todas las bandas a 0
    filters.forEach((f) => { f.gain.value = 0 })
  }
}

export function setEqualizerBands(bands) {
  if (!connected) return
  if (!Array.isArray(bands)) return
  bands.forEach((val, i) => {
    if (filters[i] && typeof val === 'number') {
      filters[i].gain.value = enabled ? val : 0
    }
  })
}

export function applyEqualizerPreset(name) {
  const p = PRESETS[name]
  if (!p) return
  if (enabled) {
    p.forEach((val, i) => {
      if (filters[i]) filters[i].gain.value = val
    })
  }
  return p
}

export function getEqualizerState() {
  return {
    enabled,
    bands: connected ? filters.map((f) => f.gain.value) : new Array(NUM_BANDS).fill(0),
  }
}

export function isEqualizerConnected() {
  return connected
}
