'use strict'

/**
 * Turtune API — backend Node para la app Android (y para cualquier otro cliente).
 *
 * Reutiliza al 100% el núcleo de electron/core/ (search, resolver, proxy,
 * playlist, settings). El mismo código que sirve la app de escritorio sirve
 * aquí, sin duplicación.
 *
 * Variables de entorno:
 *   PORT                 (default 8787)
 *   HOST                 (default 0.0.0.0)
 *   TURTUNE_DATA_DIR     (default ./data)  → persiste settings/cookies
 *   TURTUNE_API_TOKEN    (opcional)        → si se define, todas las rutas
 *                                            exigen `Authorization: Bearer <token>`
 *
 * Arranque local:
 *   cd server && npm install && npm start
 *   → http://localhost:8787/health
 *
 * Emulador Android → host del PC:
 *   http://10.0.2.2:8787/health
 */

const express = require('express')
const cors = require('cors')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

// Núcleo reutilizado (rutas relativas: server/src → ../../electron/core)
const settings = require('../../electron/core/settings')
const { searchTracks } = require('../../electron/core/search')
const { resolveAudioUrl } = require('../../electron/core/resolver')
const { handleRequest: handleProxyRequest } = require('../../electron/core/proxy')
const { importPlaylist } = require('../../electron/core/playlist')

const PORT = Number(process.env.PORT) || 8787
const HOST = process.env.HOST || '0.0.0.0'
const DATA_DIR = process.env.TURTUNE_DATA_DIR || path.join(__dirname, '..', 'data')
const API_TOKEN = process.env.TURTUNE_API_TOKEN || ''

settings.init(DATA_DIR)
fs.mkdirSync(DATA_DIR, { recursive: true })

const app = express()
app.set('trust proxy', true)

// CORS: permitir WebView de Capacitor/Android y desarrollo local
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true) // curl / mismo origen
    const allowed = [
      /^capacitor:\/\//,
      /^ionic:\/\//,
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^http:\/\/10\.0\.2\.2(:\d+)?$/, // emulador Android
    ]
    if (allowed.some((r) => r.test(origin))) return cb(null, true)
    cb(new Error('CORS: origen no permitido'))
  },
  credentials: true,
}))

app.use(express.json())

// Token opcional (recomendado si el backend sale a internet)
if (API_TOKEN) {
  app.use((req, res, next) => {
    if (req.path === '/health') return next()
    const auth = req.headers.authorization ?? ''
    if (auth !== `Bearer ${API_TOKEN}`) {
      return res.status(401).json({ ok: false, error: 'Token inválido o ausente (Authorization: Bearer <token>)' })
    }
    next()
  })
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, version: require('../package.json').version, node: process.version })
})

app.get('/search', async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  const limit = Math.min(Number(req.query.limit) || 15, 25)
  if (!q) return res.status(400).json({ ok: false, error: 'Falta el parámetro q' })
  try {
    const items = await searchTracks(q, limit)
    res.json({ ok: true, items })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) })
  }
})

// Proxy de audio: reutiliza el handler de electron/core/proxy.js (Range, 403→retry, solo 127.0.0.1 → aquí bind 0.0.0.0)
app.all('/stream/:id', (req, res) => {
  handleProxyRequest(req, res).catch((err) => {
    if (!res.headersSent) res.status(502).json({ ok: false, error: String(err?.message ?? err) })
    else res.destroy()
  })
})

app.post('/playlist/import', async (req, res) => {
  try {
    const { title, items } = await importPlaylist(String(req.body?.url ?? ''))
    res.json({ ok: true, title, items })
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err?.message ?? err) })
  }
})

// Settings: cookie browser
app.get('/settings/cookie-browser', (_req, res) => {
  res.json({ ok: true, cookieBrowser: settings.getCookieBrowser() })
})
app.post('/settings/cookie-browser', (req, res) => {
  const id = String(req.body?.cookieBrowser ?? 'none')
  if (!['none', 'edge', 'chrome', 'firefox'].includes(id)) {
    return res.status(400).json({ ok: false, error: 'Navegador no soportado' })
  }
  settings.set('cookieBrowser', id)
  res.json({ ok: true, cookieBrowser: settings.getCookieBrowser() })
})

// Cuenta de YouTube: en el backend (MVP) solo devuelve "no configurado".
// El flujo OAuth completo vive en la app de escritorio (electron/google.js).
app.get('/account/status', (_req, res) => {
  res.json({ configured: false, connected: false, clientId: '', cookieBrowser: settings.getCookieBrowser() })
})
app.get('/account/playlists', (_req, res) => {
  res.json({ ok: false, error: 'Vincular cuenta solo disponible en la app de escritorio (por ahora).', items: [], channel: null })
})
app.get('/account/playlist-tracks/:id', (_req, res) => {
  res.json({ ok: false, error: 'Vincular cuenta solo disponible en la app de escritorio (por ahora).', items: [] })
})

const server = app.listen(PORT, HOST, () => {
  console.log(`[turtune-api] escuchando en http://${HOST}:${PORT}`)
  console.log(`[turtune-api] datos: ${DATA_DIR}`)
  if (API_TOKEN) console.log('[turtune-api] token activo (Authorization: Bearer <token>)')
  else console.log('[turtune-api] SIN token — solo uso personal en LAN/localhost')
})

function shutdown() {
  console.log('[turtune-api] cerrando…')
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 5000).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
