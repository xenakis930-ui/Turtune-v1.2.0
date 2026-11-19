/**
 * equalizer.js — Ecualizador de 3 bandas (bajos, medios, agudos) vía Web Audio API.
 * Inserta un grafo de audio entre el <audio> y los altavoces.
 * Solo funciona en web/Electron (no en Android nativo, donde ExoPlayer maneja el audio).
 */
let ctx = null
let source = null
let bass = null
let mid = null
let treble = null
let gain = null
let connected = false
let enabled = false

const PRESETS = {
  flat: { bass: 0, mid: 0, treble: 0 },
  rock: { bass: 4, mid: -1, treble: 3 },
  pop: { bass: 2, mid: 1, treble: 2 },
  jazz: { bass: 2, mid: 0, treble: 2 },
  classical: { bass: 0, mid: 0, treble: 2 },
  bass: { bass: 6, mid: -2, treble: -1 },
  vocal: { bass: -2, mid: 4, treble: 1 },
  electronic: { bass: 3, mid: -1, treble: 3 },
}

export const EQ_PRESETS = PRESETS

export function initEqualizer(audioEl) {
  if (connected || !audioEl) return
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    ctx = new AudioContext()

    source = ctx.createMediaElementSource(audioEl)

    bass = ctx.createBiquadFilter()
    bass.type = 'lowshelf'
    bass.frequency.value = 200
    bass.gain.value = 0

    mid = ctx.createBiquadFilter()
    mid.type = 'peaking'
    mid.frequency.value = 1000
    mid.Q.value = 1
    mid.gain.value = 0

    treble = ctx.createBiquadFilter()
    treble.type = 'highshelf'
    treble.frequency.value = 4000
    treble.gain.value = 0

    gain = ctx.createGain()
    gain.gain.value = 1

    // Cadena: source → bass → mid → treble → gain → destination
    source.connect(bass)
    bass.connect(mid)
    mid.connect(treble)
    treble.connect(gain)
    gain.connect(ctx.destination)

    connected = true
  } catch (err) {
    console.warn('[turtune:eq] no se pudo inicializar el ecualizador:', err?.message ?? err)
  }
}

export function setEqualizerEnabled(on) {
  enabled = !!on
  if (!connected) return
  if (enabled) {
    // reconectar la cadena (ya está conectada, solo aseguramos)
  } else {
    // bypass: desconectar filtros, conectar source directo a destination
    try {
      source.disconnect()
      bass.disconnect()
      mid.disconnect()
      treble.disconnect()
      gain.disconnect()
      source.connect(ctx.destination)
    } catch { /* noop */ }
  }
  if (enabled && connected) {
    try {
      source.disconnect()
      source.connect(bass)
      bass.connect(mid)
      mid.connect(treble)
      treble.connect(gain)
      gain.connect(ctx.destination)
    } catch { /* noop */ }
  }
}

export function setEqualizerBands({ bass: b, mid: m, treble: t }) {
  if (!connected) return
  if (typeof b === 'number') bass.gain.value = b
  if (typeof m === 'number') mid.gain.value = m
  if (typeof t === 'number') treble.gain.value = t
}

export function applyEqualizerPreset(name) {
  const p = PRESETS[name]
  if (!p) return
  setEqualizerBands(p)
  return p
}

export function getEqualizerState() {
  return {
    enabled,
    bass: connected ? bass.gain.value : 0,
    mid: connected ? mid.gain.value : 0,
    treble: connected ? treble.gain.value : 0,
  }
}

export function isEqualizerConnected() {
  return connected
}
EOF