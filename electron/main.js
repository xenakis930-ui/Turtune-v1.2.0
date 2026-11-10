'use strict'

const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('node:path')
const { searchTracks } = require('./core/search')
const { resolveAudioUrl } = require('./core/resolver')
const { startProxy, stopProxy, getPort } = require('./core/proxy')
const { importPlaylist } = require('./core/playlist')
const google = require('./google')
const youtube = require('./youtube')
const settings = require('./core/settings')
const browserSession = require('./browserSession')

settings.init(app.getPath('userData'))

const isDev = process.env.NODE_ENV === 'development'
const DEV_URL = process.env.VITE_DEV_URL || 'http://localhost:5173'

/** @type {BrowserWindow | null} */
let mainWindow = null
app.isQuitting = false
let tray = null

function sendUpdateStatus(type, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', { type, payload })
  }
}

/** Bandeja del sistema: minimizar a tray + controles rápidos. */
function createTray() {
  if (tray) return
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  } catch {
    icon = nativeImage.createEmpty()
  }
  tray = new Tray(icon)
  tray.setToolTip('Turtune — audio-only')

  const showWindow = () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }

  const template = [
    { label: 'Turtune', enabled: false },
    { type: 'separator' },
    { label: 'Play / Pausa', click: () => mainWindow?.webContents.send('tray:play') },
    { label: 'Siguiente', click: () => mainWindow?.webContents.send('tray:next') },
    { label: 'Anterior', click: () => mainWindow?.webContents.send('tray:previous') },
    { type: 'separator' },
    { label: 'Mostrar Turtune', click: showWindow },
    { label: 'Salir', click: () => { app.isQuitting = true; app.quit() } },
  ]
  tray.setContextMenu(Menu.buildFromTemplate(template))
  tray.on('click', showWindow)
}

function destroyTray() {
  if (tray) { tray.destroy(); tray = null }
}

/** Comprobación silenciosa al arrancar (solo empaquetado; en dev no molesta). */
function setupAutoUpdater() {
  if (isDev) return
  try {
    autoUpdater.on('update-available', (info) => sendUpdateStatus('available', info?.version))
    autoUpdater.on('update-not-available', () => sendUpdateStatus('not-available'))
    autoUpdater.on('update-downloaded', (info) => sendUpdateStatus('downloaded', info?.version))
    autoUpdater.on('error', (err) => sendUpdateStatus('error', String(err?.message ?? err).slice(0, 200)))
    const t = setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[turtune:update] check', err?.message ?? err)
      })
    }, 4000)
    t.unref?.()
  } catch (err) {
    console.error('[turtune:update]', err)
  }
}

function friendlyError(err) {
  if (err?.code === 'EQUOTA') {
    return 'Cuota diaria de YouTube API agotada (10.000 unidades/día). Inténtalo mañana o usa otra cuenta de Cloud.'
  }
  if (err?.code === 'ETOLTIMEOUT' || err?.code === 'ERESOLVE_TIMEOUT') {
    return 'Tardó demasiado en responder (timeout 4s). Inténtalo de nuevo.'
  }
  if (err?.code === 'EYTDLP') {
    return 'yt-dlp no pudo procesar la petición. Revisa tu conexión o actualiza yt-dlp.'
  }
  return String(err?.message ?? err).slice(0, 300)
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 840,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: '#101A1B',
    title: 'Turtune',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required', // permite play() tras "Siguiente" sin click
      spellcheck: false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Ventanas nuevas / navegación externa → navegador del sistema, nunca dentro de la app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (e) => e.preventDefault())

  // Minimizar a la bandeja en vez de cerrar (Spotify-like)
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  if (isDev) {
    await mainWindow.loadURL(DEV_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

function registerIpc() {
  ipcMain.handle('search:tracks', async (_event, query) => {
    try {
      const items = await searchTracks(String(query ?? ''), 18)
      return { ok: true, items }
    } catch (err) {
      console.error('[turtune:search]', err)
      return { ok: false, error: friendlyError(err) }
    }
  })

  // Utilitario/diagnóstico: devuelve la URL cruda (la UI usa el proxy, no esto).
  ipcMain.handle('stream:resolve', async (_event, videoId) => {
    try {
      const url = await resolveAudioUrl(String(videoId ?? ''))
      return { ok: true, url }
    } catch (err) {
      console.error('[turtune:resolve]', err)
      return { ok: false, error: friendlyError(err) }
    }
  })

  // Importa una playlist pública de YouTube (metadatos; audio se resuelve al reproducir).
  ipcMain.handle('playlist:import', async (_event, url) => {
    try {
      const { title, items } = await importPlaylist(url)
      return { ok: true, title, items }
    } catch (err) {
      console.error('[turtune:playlist]', err)
      return { ok: false, error: friendlyError(err) }
    }
  })

  // ---------- Cuenta de YouTube (OAuth o sesión del navegador) ----------
  ipcMain.handle('account:status', () => ({ ...google.status(), ...browserSession.status() }))

  // Detección de sesión: un clic, sin proyectos de Google Cloud
  ipcMain.handle('account:detect-browser', async () => {
    try {
      return await browserSession.detect()
    } catch (err) {
      console.error('[turtune:session] detect', err)
      return { ok: false, error: friendlyError(err) }
    }
  })

  ipcMain.handle('account:set-cookie-browser', (_event, browserId) => {
    try {
      return { ok: true, ...browserSession.setBrowser(String(browserId ?? 'none')) }
    } catch (err) {
      return { ok: false, error: friendlyError(err) }
    }
  })

  ipcMain.handle('account:save-config', (_event, cfg) => {
    try {
      return { ok: true, ...google.saveConfig(cfg ?? {}) }
    } catch (err) {
      return { ok: false, error: friendlyError(err) }
    }
  })

  ipcMain.handle('account:delete-config', () => ({ ok: true, ...google.deleteConfig() }))
  ipcMain.handle('account:disconnect', () => ({ ok: true, ...google.disconnect() }))

  ipcMain.handle('account:connect', async () => {
    try {
      const st = await google.connect()
      return { ok: true, ...st }
    } catch (err) {
      console.error('[turtune:account] connect', err)
      return { ok: false, error: friendlyError(err) }
    }
  })

  ipcMain.handle('account:playlists', async () => {
    try {
      const token = await google.getAccessToken()
      const [items, channel] = await Promise.all([
        youtube.listMyPlaylists(token),
        youtube.getMyChannel(token).catch(() => null),
      ])
      return { ok: true, items, channel }
    } catch (err) {
      console.error('[turtune:account] playlists', err)
      return { ok: false, error: friendlyError(err) }
    }
  })

  ipcMain.handle('account:playlist-tracks', async (_event, payload) => {
    try {
      const playlistId = String(payload?.playlistId ?? '')
      if (!/^[A-Za-z0-9_-]{6,}$/.test(playlistId)) throw new Error('playlistId inválido')
      const max = Math.min(Number(payload?.max) || 200, 200)
      const token = await google.getAccessToken()
      const tracks = await youtube.getPlaylistTracks(token, playlistId, { maxItems: max })
      return { ok: true, items: tracks }
    } catch (err) {
      console.error('[turtune:account] playlist-tracks', err)
      return { ok: false, error: friendlyError(err) }
    }
  })

  // Calienta la caché del resolver para la pista siguiente (audio-only, sin bytes).
  ipcMain.handle('stream:prefetch', async (_event, videoId) => {
    try {
      await resolveAudioUrl(String(videoId ?? ''))
      return { ok: true }
    } catch (err) {
      // Prefetch oportunista: nunca debe romper la reproducción actual.
      console.warn('[turtune:prefetch]', err?.message ?? err)
      return { ok: false }
    }
  })

  ipcMain.handle('server:info', () => ({ port: getPort() }))
  ipcMain.handle('app:version', () => app.getVersion())

  // ---------- Actualizaciones automáticas (GitHub Releases) ----------
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, version: result?.updateInfo?.version ?? null }
    } catch (err) {
      console.warn('[turtune:update]', err?.message ?? err)
      return { ok: false, error: friendlyError(err), dev: isDev }
    }
  })

  ipcMain.handle('update:quit-and-install', () => {
    try {
      autoUpdater.quitAndInstall()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: String(err?.message ?? err) }
    }
  })

  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:toggle-maximize', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
}

// Instancia única: si Turtune ya está abierto, traerlo al frente en vez de
// abrir una segunda copia (evita contienda de la caché de Chromium).
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('before-quit', () => { app.isQuitting = true })

  app.whenReady().then(async () => {
    try {
      await startProxy()
    } catch (err) {
      console.error('[turtune:proxy] no se pudo iniciar el proxy de audio:', err)
    }

    registerIpc()
    await createWindow()
    createTray()
    setupAutoUpdater()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    // Con bandeja del sistema, la app sigue viva en tray; solo se cierra si el
    // usuario eligió "Salir" (app.isQuitting = true).
    if (app.isQuitting) {
      destroyTray()
      stopProxy()
      app.quit()
    }
  })

  app.on('quit', () => { destroyTray(); stopProxy() })
}
