/**
 * api.js — Frontera única entre la UI y el backend (Electron IPC o HTTP).
 *
 * Modos:
 *   1) Desktop (Electron): window.turtune (IPC al proceso main).
 *   2) Backend (Android / web): HTTP a la URL configurada en Ajustes.
 *   3) Demo (navegador sin backend): datos embebidos + WAV silencioso.
 */

import { getBackendUrl, hasBackend, backendUrl } from './backend'
import { DEMO_TRACKS, demoSearch } from '../demo/mock'
import { makeSilentWavDataUri } from '../demo/silentWav'

const hasBridge = () => typeof window !== 'undefined' && !!window.turtune
export const isDesktop = hasBridge()

/** Fetch JSON con manejo de errores uniforme. */
export async function backendFetch(path, init) {
  const url = backendUrl(path)
  if (!url) throw new Error('Backend no configurado')
  const res = await fetch(url, init)
  let data = null
  try { data = await res.json() } catch { /* sin cuerpo */ }
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`)
  return data
}

/* ---------- Búsqueda ---------- */
export async function searchBackend(query) {
  if (hasBridge()) return window.turtune.search(query)
  if (hasBackend()) {
    const data = await backendFetch(`/search?q=${encodeURIComponent(String(query ?? ''))}&limit=18`)
    return { ok: true, items: data?.items ?? [] }
  }
  await new Promise((r) => setTimeout(r, 380))
  return { ok: true, items: demoSearch(query) }
}

/* ---------- URL de stream reproducible ---------- */
export async function getStreamUrl(videoId) {
  if (hasBridge()) return window.turtune.getStreamUrl(videoId)
  if (hasBackend()) return backendUrl(`/stream/${encodeURIComponent(videoId)}`)
  return makeSilentWavDataUri(6)
}

/* ---------- Importar playlist ---------- */
export async function importPlaylist(url) {
  if (hasBridge()) return window.turtune.importPlaylist(url)
  if (hasBackend()) {
    const data = await backendFetch('/playlist/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    return { ok: true, title: data?.title, items: data?.items ?? [] }
  }
  await new Promise((r) => setTimeout(r, 700))
  return { ok: true, title: 'Playlist demo', items: DEMO_TRACKS.slice(0, 6) }
}

/* ---------- Versión ---------- */
export async function getAppVersion() {
  if (hasBridge()) return window.turtune.version()
  if (hasBackend()) {
    const data = await backendFetch('/health')
    return data?.version ?? 'backend'
  }
  return 'web-demo'
}

/* ---------- Cuenta de YouTube (OAuth readonly) ---------- */
export const account = {
  status: () => {
    if (hasBridge()) return window.turtune.account.status()
    if (hasBackend()) return backendFetch('/account/status').catch(() => ({ configured: false, connected: false, clientId: '', cookieBrowser: 'none' }))
    return Promise.resolve({ configured: false, connected: false, clientId: '', cookieBrowser: 'none' })
  },
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

export const windowControls = {
  minimize: () => window.turtune?.window?.minimize(),
  toggleMaximize: () => window.turtune?.window?.toggleMaximize(),
  close: () => window.turtune?.window?.close(),
  available: hasBridge(),
}

export const updater = {
  available: hasBridge(),
  check: () => (hasBridge() ? window.turtune.updates.check() : Promise.resolve({ ok: false, available: false, error: 'Solo en la app de escritorio' })),
  quitAndInstall: () => (hasBridge() ? window.turtune.updates.quitAndInstall() : Promise.resolve({ ok: false })),
  onStatus: (cb) => (hasBridge() ? window.turtune.updates.onStatus(cb) : () => {}),
}

export { DEMO_TRACKS }
export { getBackendUrl, setBackendUrl, hasBackend, backendUrl } from './backend'
