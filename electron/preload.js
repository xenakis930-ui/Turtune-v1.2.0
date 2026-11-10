'use strict'

/**
 * preload.js — Puente seguro contextBridge (sandbox + contextIsolation).
 * La página NO tiene acceso a Node; solo a `window.turtune`.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('turtune', {
  /** Busca tracks: Promise<{ok:true, items:Track[]} | {ok:false, error:string}> */
  search: (query) => ipcRenderer.invoke('search:tracks', query),

  /** Resuelve URL cruda de audio (debug; la UI reproduce vía proxy local). */
  resolveStream: (videoId) => ipcRenderer.invoke('stream:resolve', videoId),

  /** Calienta la caché del resolver para la siguiente pista (best effort). */
  prefetch: (videoId) => ipcRenderer.invoke('stream:prefetch', videoId),

  /** Importa metadatos de una playlist pública de YouTube. */
  importPlaylist: (url) => ipcRenderer.invoke('playlist:import', url),

  /** Cuenta de YouTube (OAuth readonly): conectar, listar y extraer playlists. */
  account: {
    status: () => ipcRenderer.invoke('account:status'),
    saveConfig: (cfg) => ipcRenderer.invoke('account:save-config', cfg),
    deleteConfig: () => ipcRenderer.invoke('account:delete-config'),
    disconnect: () => ipcRenderer.invoke('account:disconnect'),
    connect: () => ipcRenderer.invoke('account:connect'),
    detectBrowser: () => ipcRenderer.invoke('account:detect-browser'),
    setCookieBrowser: (id) => ipcRenderer.invoke('account:set-cookie-browser', id),
    playlists: () => ipcRenderer.invoke('account:playlists'),
    playlistTracks: (playlistId, max) => ipcRenderer.invoke('account:playlist-tracks', { playlistId, max }),
  },

  /** URL same-origin-ish del proxy local para el <audio> (audio-only, Range habilitado). */
  getStreamUrl: async (videoId) => {
    const { port } = await ipcRenderer.invoke('server:info')
    if (!port) throw new Error('El proxy de audio no está disponible')
    return `http://127.0.0.1:${port}/stream/${encodeURIComponent(videoId)}`
  },

  /** Bandeja del sistema: suscribirse a acciones (play/next/previous). */
  onTray: (action, cb) => {
    const channel = `tray:${String(action)}`
    const listener = () => { try { cb() } catch { /* noop */ } }
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },

  /** Actualizaciones automáticas (GitHub Releases). */
  updates: {
    check: () => ipcRenderer.invoke('update:check'),
    quitAndInstall: () => ipcRenderer.invoke('update:quit-and-install'),
    onStatus: (cb) => {
      const listener = (_event, data) => cb(data)
      ipcRenderer.on('update:status', listener)
      return () => ipcRenderer.removeListener('update:status', listener)
    },
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
})
