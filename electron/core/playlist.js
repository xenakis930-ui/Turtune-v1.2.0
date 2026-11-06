'use strict'

/**
 * playlist.js — Importa playlists de YouTube (solo metadatos, vía `yt-dlp --flat-playlist`).
 * Acepta URLs de tipo youtube.com/playlist?list=…, watch?…list=… o youtu.be/…list=…
 */

const { runYtDlp, withBrowserCookies } = require('./ytdlp')
const { normalizeEntry } = require('./search')

const MAX_ITEMS = 100
const TIMEOUT_MS = 30000

/**
 * @param {string} rawUrl
 * @returns {Promise<{ title: string, items: Array<object> }>}
 */
async function importPlaylist(rawUrl) {
  const url = String(rawUrl ?? '').trim()
  if (!url) throw new Error('Pega una URL de playlist de YouTube.')

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('La URL no es válida. Ejemplo: https://www.youtube.com/playlist?list=PL…')
  }
  const host = parsed.hostname.toLowerCase().replace(/^(www\.|music\.|m\.)/, '')
  const isYouTube = host === 'youtube.com' || host === 'youtu.be'
  if (!isYouTube || !parsed.searchParams.get('list')) {
    throw new Error('La URL debe ser de una playlist pública de YouTube (…list=PL…).')
  }

  const raw = await runYtDlp(
    withBrowserCookies([
      '--flat-playlist',
      '-J',
      '--no-warnings',
      '--playlist-end', String(MAX_ITEMS),
      '--', url,
    ]),
    { timeoutMs: TIMEOUT_MS },
  )

  let data
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('Respuesta inválida de yt-dlp al leer la playlist.')
  }

  const title = String(data?.title ?? data?.playlist_title ?? 'Playlist importada')
  const entries = Array.isArray(data?.entries) ? data.entries : []
  const items = entries.map(normalizeEntry).filter(Boolean)

  if (!items.length) {
    throw new Error('La playlist está vacía, es privada o no tiene vídeos accesibles.')
  }
  return { title, items }
}

module.exports = { importPlaylist }
