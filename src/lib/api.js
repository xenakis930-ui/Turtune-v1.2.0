/**
 * api.js — Frontera única entre la UI y el proceso main (preload `window.turtune`).
 * En un navegador normal (sin Electron) cae en modo demo con datos embebidos
 * para poder previsualizar la interfaz; en escritorio siempre usa el backend real.
 */

import { DEMO_TRACKS, demoSearch } from '../demo/mock'
import { makeSilentWavDataUri } from '../demo/silentWav'

const hasBridge = () => typeof window !== 'undefined' && !!window.turtune

export const isDesktop = hasBridge()

/** @returns {Promise<{ok:true, items:any[]} | {ok:false, error:string}>} */
export async function searchBackend(query) {
  if (hasBridge()) return window.turtune.search(query)
  await new Promise((r) => setTimeout(r, 380)) // latencia simulada
  return { ok: true, items: demoSearch(query) }
}

/** URL reproducible por el <audio>: proxy local (Electron) o WAV silencioso (demo). */
export async function getStreamUrl(videoId) {
  if (hasBridge()) return window.turtune.getStreamUrl(videoId)
  return makeSilentWavDataUri(6)
}

/**
 * Importa metadatos de una playlist pública de YouTube.
 * En demo devuelve una muestra local.
 */
export async function importPlaylist(url) {
  if (hasBridge()) return window.turtune.importPlaylist(url)
  await new Promise((r) => setTimeout(r, 700))
  return { ok: true, title: 'Playlist demo', items: DEMO_TRACKS.slice(0, 6) }
}

export async function getAppVersion() {
  if (hasBridge()) return window.turtune.version()
  return 'demo'
}

/**
 * Cuenta de YouTube (OAuth readonly). En navegador (demo) devuelve estados
 * "sin vincular" y la UI muestra que solo está disponible en la app de escritorio.
 */
export const account = {
  status: () =>
    hasBridge() ? window.turtune.account.status() : Promise.resolve({ configured: false, connected: false, clientId: '' }),
  saveConfig: (cfg) =>
    hasBridge() ? window.turtune.account.saveConfig(cfg) : Promise.resolve({ ok: false, error: 'Disponible solo en la app de escritorio' }),
  deleteConfig: () =>
    hasBridge() ? window.turtune.account.deleteConfig() : Promise.resolve({ ok: true, configured: false, clientId: '' }),
  disconnect: () =>
    hasBridge() ? window.turtune.account.disconnect() : Promise.resolve({ ok: true, connected: false }),
  connect: () =>
    hasBridge() ? window.turtune.account.connect() : Promise.resolve({ ok: false, error: 'Disponible solo en la app de escritorio' }),
  detectBrowser: () =>
    hasBridge() ? window.turtune.account.detectBrowser() : Promise.resolve({ ok: false, error: 'Disponible solo en la app de escritorio' }),
  setCookieBrowser: (id) =>
    hasBridge() ? window.turtune.account.setCookieBrowser(id) : Promise.resolve({ ok: true, cookieBrowser: id }),
  playlists: () =>
    hasBridge() ? window.turtune.account.playlists() : Promise.resolve({ ok: true, items: [], channel: null }),
  playlistTracks: (playlistId, max) =>
    hasBridge() ? window.turtune.account.playlistTracks(playlistId, max) : Promise.resolve({ ok: true, items: [] }),
}

/** Actualizaciones automáticas (GitHub Releases). En demo no hay canal. */
export const updater = {
  available: hasBridge(),
  check: () =>
    hasBridge() ? window.turtune.updates.check() : Promise.resolve({ ok: false, available: false, error: 'Solo en la app de escritorio' }),
  quitAndInstall: () =>
    hasBridge() ? window.turtune.updates.quitAndInstall() : Promise.resolve({ ok: false }),
  onStatus: (cb) => (hasBridge() ? window.turtune.updates.onStatus(cb) : () => {}),
}

export const windowControls = {
  minimize: () => window.turtune?.window?.minimize(),
  toggleMaximize: () => window.turtune?.window?.toggleMaximize(),
  close: () => window.turtune?.window?.close(),
  available: hasBridge(),
}

export { DEMO_TRACKS }
