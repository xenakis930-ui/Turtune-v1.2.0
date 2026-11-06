'use strict'

/**
 * browserSession.js — "Un clic" para que Turtune pueda ver e importar tus
 * playlists privadas usando la sesión que ya tienes en tu navegador.
 *
 * yt-dlp sabe descifrar las cookies cifradas (DPAPI en Windows); Turtune
 * nunca toca contraseñas ni tokens directamente.
 *
 * Detección: probamos tu "Ver más tarde" (playlist privada WL) — solo es
 * legible con sesión iniciada. Si responde, guardamos el navegador en
 * ajustes; en caso contrario devolvemos un error legible.
 */

const { runYtDlp } = require('./core/ytdlp')
const settings = require('./core/settings')

const CANDIDATES = [
  { id: 'edge', name: 'Microsoft Edge' },
  { id: 'chrome', name: 'Google Chrome' },
  { id: 'firefox', name: 'Firefox' },
]

async function probe(browser) {
  const raw = await runYtDlp(
    [
      '--cookies-from-browser', browser,
      '--flat-playlist',
      '-J',
      '--playlist-end', '1',
      '--no-warnings',
      '--',
      'https://www.youtube.com/playlist?list=WL',
    ],
    { timeoutMs: 12000 },
  )
  let data = null
  try {
    data = JSON.parse(raw)
  } catch {
    return { ok: false }
  }
  // Con sesión válida yt-dlp responde (aunque la lista esté vacía)
  return { ok: Array.isArray(data?.entries) || typeof data?.title === 'string', title: data?.title ?? null }
}

async function detect() {
  const errors = []
  for (const { id, name } of CANDIDATES) {
    try {
      const r = await probe(id)
      if (r.ok) {
        settings.set('cookieBrowser', id)
        return { ok: true, browser: id, browserName: name }
      }
      errors.push(`${name}: respuesta inesperada`)
    } catch (err) {
      errors.push(`${name}: ${String(err?.message ?? err).slice(0, 120)}`)
    }
  }
  return {
    ok: false,
    error: 'No se encontró sesión de YouTube en Edge, Chrome ni Firefox. Abre YouTube, inicia sesión y pulsa «Detectar de nuevo».',
    details: errors,
  }
}

function setBrowser(id) {
  if (!settings.VALID_BROWSERS.includes(id)) throw new Error('Navegador no soportado')
  settings.set('cookieBrowser', id)
  return status()
}

function status() {
  return { cookieBrowser: settings.getCookieBrowser() }
}

module.exports = { detect, setBrowser, status, CANDIDATES }
