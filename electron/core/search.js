'use strict'

/**
 * search.js — Búsqueda de tracks en YouTube vía `yt-dlp ytsearch`.
 * Devuelve objetos normalizados: { id, title, artist, channelTitle, thumbnail, duration }
 */

const { runYtDlp } = require('./ytdlp')

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const MAX_QUERY = 120

/**
 * @param {string} query
 * @param {number} [limit]
 * @returns {Promise<Array<{id:string,title:string,artist:string,channelTitle:string,thumbnail:string,duration:number|null}>>}
 */
async function searchTracks(query, limit = 15) {
  const q = String(query ?? '').trim()
  if (!q) return []
  if (q.length > MAX_QUERY) throw new Error(`La búsqueda supera los ${MAX_QUERY} caracteres`)

  const n = Math.min(Math.max(1, Number(limit) || 15), 25)

  const raw = await runYtDlp(
    ['--flat-playlist', '-J', '--no-warnings', '--no-playlist', '--', `ytsearch${n}:${q}`],
    { timeoutMs: 15000 },
  )

  let data
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('Respuesta inválida de yt-dlp al buscar')
  }

  const entries = Array.isArray(data?.entries) ? data.entries : []
  return entries.map(normalizeEntry).filter(Boolean)
}

function normalizeEntry(e) {
  const id = e?.id
  if (!id || !VIDEO_ID.test(id)) return null
  const artist = e?.channel || e?.uploader || e?.channelTitle || e?.artist || 'Canal desconocido'
  const duration = Number.isFinite(e?.duration) ? Math.round(e.duration) : null
  return {
    id,
    title: String(e?.title ?? 'Sin título'),
    artist: String(artist),
    channelTitle: String(artist),
    duration,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  }
}

module.exports = { searchTracks, VIDEO_ID, normalizeEntry }
