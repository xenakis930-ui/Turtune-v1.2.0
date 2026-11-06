/**
 * mediaSession.js — Integración con la Media Session API del sistema:
 * teclas multimedia (play/pause/next/prev/seek), metadatos y estado en la
 * barra de tareas / centro de acciones de Windows.
 *
 * Se suscribe al store por sí mismo; la app solo llama a initMediaSession().
 */

import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'

const hasMediaSession =
  typeof navigator !== 'undefined' && 'mediaSession' in navigator

let wired = false
let lastPositionSync = 0

export function initMediaSession(controls) {
  if (!hasMediaSession || wired) return
  wired = true

  const safeSet = (action, handler) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler)
    } catch {
      /* acción no soportada por esta plataforma */
    }
  }

  safeSet('play', controls.togglePlay)
  safeSet('pause', controls.togglePlay)
  safeSet('previoustrack', controls.previous)
  safeSet('nexttrack', () => controls.next(false))
  safeSet('seekto', (details) => {
    if (typeof details?.seekTime === 'number') controls.seekTo(details.seekTime)
  })

  // Metadatos y estado se derivan del store (suscripción única)
  usePlayerStore.subscribe((state, prev) => {
    if (state.current !== prev.current) {
      syncMetadata(state.current)
      syncPlaybackState(state.playbackState)
      syncPosition(state)
      return
    }
    if (state.playbackState !== prev.playbackState) {
      syncPlaybackState(state.playbackState)
    }
    // Throttle: posición como mucho 1 vez por segundo
    if (state.currentTime !== prev.currentTime && state.currentTime - lastPositionSync >= 1) {
      lastPositionSync = state.currentTime
      syncPosition(state)
    }
  })
}

function syncMetadata(track) {
  try {
    if (!track) {
      navigator.mediaSession.metadata = null
      return
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title ?? 'Sin título',
      artist: track.artist ?? 'Artista desconocido',
      album: 'Turtune · YouTube audio-only',
      artwork: track.thumbnail
        ? [{ src: track.thumbnail, sizes: '480x360', type: 'image/jpeg' }]
        : [],
    })
  } catch {
    /* MediaMetadata no disponible */
  }
}

function syncPlaybackState(playbackState) {
  try {
    navigator.mediaSession.playbackState =
      playbackState === PLAYBACK.PLAYING || playbackState === PLAYBACK.LOADING
        ? 'playing'
        : playbackState === PLAYBACK.PAUSED
          ? 'paused'
          : 'none'
  } catch {
    /* noop */
  }
}

function syncPosition(state) {
  try {
    const duration = Number(state.duration) || Number(state.current?.duration) || 0
    if (!Number.isFinite(duration) || duration <= 0) return
    navigator.mediaSession.setPositionState({
      duration,
      position: Math.min(Math.max(0, state.currentTime || 0), duration),
      playbackRate: 1,
    })
  } catch {
    /* setPositionState rechaza valores no finitos en algunas plataformas */
  }
}
