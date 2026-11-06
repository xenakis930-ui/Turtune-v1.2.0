'use strict'

/**
 * resolver.js — Resolución de stream de AUDIO (audio-only) vía yt-dlp.
 *
 * Spec:
 *  - `yt-dlp -g -f bestaudio <URL>`
 *  - Timeout estricto de 4 s para resolver.
 *  - Se cachea la URL cruda (googlevideo) hasta ~10 min antes de que caduque
 *    (el parámetro `expire` de la URL lo dicta YouTube).
 *
 * El stream de audio se entrega al <audio> de la UI a través de un proxy
 * HTTP local (ver core/proxy.js), que reenvía Range requests para seek.
 */

const { runYtDlp, YtDlpTimeoutError, withBrowserCookies } = require('./ytdlp')
const { VIDEO_ID } = require('./search')

/** Selector: m4a/AAC (128 kbps) preferente; si no, opus (~160 kbps); jamás video. */
const FORMAT = 'bestaudio[ext=m4a]/bestaudio[acodec=opus]/bestaudio'
const RESOLVE_TIMEOUT_MS = 4000
const FALLBACK_TTL_MS = 5 * 60 * 60 * 1000
const EXPIRY_MARGIN_MS = 10 * 60 * 1000

/** @type {Map<string, { url: string, expiresAt: number }>} */
const cache = new Map()

/**
 * @param {string} videoId
 * @param {{ forceRefresh?: boolean }} [opts]
 * @returns {Promise<string>} URL cruda (temporal) del stream de audio
 */
async function resolveAudioUrl(videoId, { forceRefresh = false } = {}) {
  const id = String(videoId ?? '').trim()
  if (!VIDEO_ID.test(id)) throw new Error('videoId inválido')

  const cached = cache.get(id)
  if (!forceRefresh && cached && cached.expiresAt - Date.now() > EXPIRY_MARGIN_MS) {
    return cached.url
  }

  let raw
  try {
    raw = await runYtDlp(
      withBrowserCookies([
        '-g',
        '-f', FORMAT,
        '--no-playlist',
        '--no-warnings',
        '--',
        `https://www.youtube.com/watch?v=${id}`,
      ]),
      { timeoutMs: RESOLVE_TIMEOUT_MS },
    )
  } catch (err) {
    if (err instanceof YtDlpTimeoutError || err?.code === 'ETOLTIMEOUT') {
      const e = new Error('La resolución del stream superó los 4 s. Inténtalo de nuevo.')
      e.code = 'ERESOLVE_TIMEOUT'
      throw e
    }
    throw err
  }

  const url = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find((s) => s.startsWith('https://'))

  if (!url) throw new Error('yt-dlp no devolvió una URL de stream de audio')

  cache.set(id, { url, expiresAt: parseExpire(url) ?? Date.now() + FALLBACK_TTL_MS })
  return url
}

function parseExpire(url) {
  try {
    const exp = new URL(url).searchParams.get('expire')
    if (exp == null) return null
    const n = Number(exp)
    return Number.isFinite(n) ? n * 1000 : null
  } catch {
    return null
  }
}

function invalidateAudioUrl(videoId) {
  cache.delete(String(videoId ?? '').trim())
}

function _cacheSize() {
  return cache.size
}

module.exports = { resolveAudioUrl, invalidateAudioUrl, RESOLVE_TIMEOUT_MS, parseExpire, _cacheSize }
