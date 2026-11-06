/**
 * engine.js — Motor de reproducción audio-only.
 *
 * Un único HTMLAudioElement persiste toda la vida de la app; sus eventos
 * sincronizan `usePlayerStore`. Los comandos (play/pause/next…) pasan por aquí.
 *
 * Flujo al pulsar Play en un ítem:
 *   1) store.beginTrack(track, contexto, index) → playbackState = LOADING
 *   2) getStreamUrl(id) → URL del proxy local (o WAV demo en navegador)
 *   3) audio.src = url → evento 'loadstart'
 *   4) 'playing' → PLAYING · 'ended' → siguiente · 'error' → ERROR + toast
 */

import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'
import { getStreamUrl } from '../lib/api'
import { initMediaSession } from './mediaSession'

const audio = new Audio()
audio.preload = 'auto'
// Sin crossOrigin: la reproducción <audio> no necesita CORS y el proxy local no lo exige.

let wired = false
let loadToken = 0 // evita carreras cuando el usuario salta de pista rápido

const s = () => usePlayerStore.getState()

export function initEngine() {
  if (wired) return
  wired = true

  audio.volume = clamp01(s().volume)
  audio.muted = s().muted

  audio.addEventListener('loadstart', () => {
    usePlayerStore.setState({ playbackState: PLAYBACK.LOADING, buffering: true })
  })
  audio.addEventListener('waiting', () => usePlayerStore.setState({ buffering: true }))
  audio.addEventListener('playing', () => {
    usePlayerStore.setState({ playbackState: PLAYBACK.PLAYING, buffering: false })
  })
  audio.addEventListener('canplay', () => usePlayerStore.setState({ buffering: false }))
  audio.addEventListener('pause', () => {
    if (!audio.ended) usePlayerStore.setState({ playbackState: PLAYBACK.PAUSED })
  })
  audio.addEventListener('timeupdate', () => {
    usePlayerStore.setState({
      currentTime: audio.currentTime,
      ...(Number.isFinite(audio.duration) && audio.duration > 0 ? { duration: audio.duration } : {}),
    })
  })
  audio.addEventListener('progress', () => {
    // Final del rango bufferizado (bytes ya cargados, listos para seek)
    try {
      if (audio.buffered?.length) {
        const end = audio.buffered.end(audio.buffered.length - 1)
        if (Number.isFinite(end)) usePlayerStore.setState({ buffered: end })
      }
    } catch {
      /* buffered no disponible aún */
    }
  })
  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      usePlayerStore.setState({ duration: audio.duration })
    }
  })
  audio.addEventListener('ended', handleEnded)
  audio.addEventListener('error', handleAudioError)

  // Teclas multimedia + metadatos del sistema (Media Session API)
  initMediaSession({ togglePlay, next, previous, seekTo })
}

function clamp01(v) {
  return Math.min(1, Math.max(0, Number(v) || 0))
}

function handleEnded() {
  const { repeat } = s()
  if (repeat === 'one') {
    audio.currentTime = 0
    audio.play().catch(() => setError('No se pudo reanudar la pista actual.'))
    return
  }
  next(true)
}

function handleAudioError() {
  // MEDIA_ERR_SRC_NOT_SUPPORTED o red: la URL puede haber caducado → el proxy
  // ya re-resolvió una vez; si aun así falla, mostramos error accionable.
  if (!audio.src) return
  const current = s().current
  usePlayerStore.setState({ playbackState: PLAYBACK.ERROR, buffering: false })
  s().pushToast(
    'error',
    current
      ? `No se pudo reproducir “${truncate(current.title, 60)}”. El stream de audio no está disponible.`
      : 'No se pudo reproducir el audio.',
  )
}

function truncate(str, n) {
  const t = String(str ?? '')
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

function setError(message) {
  usePlayerStore.setState({ playbackState: PLAYBACK.ERROR, buffering: false })
  s().pushToast('error', message)
}

function prefetchNext() {
  // Prefetch oportunista: la siguiente pista secuencial (ignora shuffle).
  try {
    const { queue, index, repeat, shuffle } = s()
    if (shuffle) return
    let nextIndex = index + 1 < queue.length ? index + 1 : repeat === 'all' ? 0 : -1
    if (nextIndex < 0) return
    window.turtune?.prefetch?.(queue[nextIndex].id)
  } catch {
    /* prefetch best-effort; nunca crítico */
  }
}

async function loadAndPlay(track, token) {
  usePlayerStore.setState({ playbackState: PLAYBACK.LOADING, buffering: true, currentTime: 0 })
  try {
    const url = await getStreamUrl(track.id)
    if (token !== loadToken) return // el usuario ya cambió de pista
    audio.src = url
    audio.currentTime = 0
    await audio.play()
    prefetchNext() // calienta la caché del resolver para el "Siguiente"
  } catch (err) {
    if (token !== loadToken) return
    setError(
      err?.name === 'NotAllowedError'
        ? 'El sistema bloqueó la reproducción automática. Pulsa Play de nuevo.'
        : `No se pudo cargar el audio (${String(err?.message ?? err).slice(0, 80)})`,
    )
  }
}

/**
 * Reproduce una pista. `contextList` define la cola (p. ej. los resultados
 * de búsqueda actuales); si se omite, la cola es solo esta pista.
 */
export function playTrack(track, contextList) {
  if (!track?.id) return
  const list = Array.isArray(contextList) && contextList.length ? contextList : [track]
  const index = Math.max(
    0,
    list.findIndex((t) => t.id === track.id),
  )
  const token = ++loadToken
  s().beginTrack(track, list, index)
  loadAndPlay(track, token)
}

export function togglePlay() {
  const { playbackState, current, duration, currentTime } = s()
  if (!current) return

  if (playbackState === PLAYBACK.PLAYING || playbackState === PLAYBACK.LOADING) {
    audio.pause()
    return
  }
  if (playbackState === PLAYBACK.PAUSED) {
    audio.play().catch(() => setError('No se pudo reanudar la reproducción.'))
    return
  }
  // IDLE | ERROR → reproducir desde el principio
  const token = ++loadToken
  usePlayerStore.setState({ currentTime: 0 })
  loadAndPlay(current, token)
}

export function next(_auto = false) {
  const { queue, index, repeat, shuffle } = s()
  if (!queue.length) return

  let nextIndex
  if (shuffle && queue.length > 1) {
    do {
      nextIndex = Math.floor(Math.random() * queue.length)
    } while (nextIndex === index)
  } else if (index + 1 < queue.length) {
    nextIndex = index + 1
  } else if (repeat === 'all') {
    nextIndex = 0
  } else {
    audio.pause()
    s().stopAtEndOfQueue()
    return
  }

  const token = ++loadToken
  s().setQueueIndex(nextIndex)
  loadAndPlay(queue[nextIndex], token)
}

export function previous() {
  const { queue, index, currentTime } = s()
  if (!queue.length) return

  // >4 s transcurridos → reinicia la pista (comportamiento Spotify)
  if (currentTime > 4 || index === 0) {
    audio.currentTime = 0
    usePlayerStore.setState({ currentTime: 0 })
    if (audio.paused) audio.play().catch(() => {})
    return
  }
  const token = ++loadToken
  s().setQueueIndex(index - 1)
  loadAndPlay(queue[index - 1], token)
}

/** Seek interactivo de la seekbar (limitado al rango [0, duration]). */
export function seekTo(seconds) {
  const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null
  let t = Math.max(0, Number(seconds) || 0)
  if (dur != null) t = Math.min(t, dur)
  if (dur != null) audio.currentTime = t
  usePlayerStore.setState({ currentTime: t })
}

export function setVolume(v) {
  const vol = clamp01(v)
  usePlayerStore.setState({ volume: vol, ...(vol > 0 ? { muted: false } : {}) })
  audio.volume = vol
  audio.muted = vol === 0 ? audio.muted : false
}

export function toggleMute() {
  const { muted, volume } = s()
  const nextMuted = !muted
  usePlayerStore.setState({ muted: nextMuted })
  audio.muted = nextMuted
  if (!nextMuted && volume === 0) {
    usePlayerStore.setState({ volume: 0.5 })
    audio.volume = 0.5
  }
}

export function playQueueIndex(i) {
  const { queue, index } = s()
  if (i === index) {
    togglePlay()
    return
  }
  if (i < 0 || i >= queue.length) return
  const token = ++loadToken
  s().setQueueIndex(i)
  loadAndPlay(queue[i], token)
}
