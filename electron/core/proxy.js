'use strict'

/**
 * proxy.js — Proxy HTTP de audio LOCAL (127.0.0.1, puerto efímero).
 *
 * ¿Por qué un proxy y no la URL cruda en el <audio>?
 *  1. googlevideo exige cabecera User-Agent de navegador.
 *  2. Reenvía `Range` → seek real sin descargar el archivo completo.
 *  3. Si Google rechaza la URL (403), se invalida y re-resuelve UNA vez.
 *  4. Solo AUDIO: el selector de formato jamás pide streams con vídeo.
 *
 * Nota de red: el upstream se obtiene con `fetch` (undici). El `https.request`
 * clásico de Node se cuelga en el TLS handshake con googlevideo desde este
 * entorno; `fetch` resuelve en <100 ms. El timeout solo cubre los headers
 * (8 s); el cuerpo se transmite en streaming y no se ve limitado por él.
 *
 * Seguridad:
 *  - Escucha únicamente en 127.0.0.1 (no accesible desde la LAN).
 *  - videoId validado con regex estricta (/^[A-Za-z0-9_-]{11}$/).
 *  - Puerto efímero aleatorio elegido por el SO (listen(0)).
 *  - Sin caché de bytes en disco; el flujo se pipea en streaming.
 */

const http = require('node:http')
const { Readable } = require('node:stream')
const { URL } = require('node:url')
const { VIDEO_ID } = require('./search')
const { resolveAudioUrl, invalidateAudioUrl } = require('./resolver')

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const HEADERS_TIMEOUT_MS = 8000

/** @type {http.Server | null} */
let server = null
let port = 0

/** GET upstream con timeout acotado a la fase de headers; devuelve el Response. */
async function upstreamGet(targetUrl, range) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), HEADERS_TIMEOUT_MS)
  try {
    const headers = {
      'User-Agent': USER_AGENT,
      Accept: '*/*',
    }
    if (range) headers.Range = range
    return await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: ac.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

/** Copia cabeceras seguras del upstream al cliente (filtra hop-by-hop). */
function passHeaders(upstreamHeaders, status) {
  const headers = {
    'accept-ranges': 'bytes',
    'cache-control': 'no-store',
    'content-type': upstreamHeaders.get('content-type') || 'audio/mp4',
  }
  for (const name of ['content-length', 'content-range', 'etag', 'last-modified']) {
    const v = upstreamHeaders.get(name)
    if (v) headers[name] = v
  }
  if (status === 200) delete headers['content-range']
  return headers
}

async function discardBody(resp) {
  try {
    await resp.body?.cancel()
  } catch {
    /* sin cuerpo o ya consumido */
  }
}

async function streamOnce(id, range, req, res, isRetry) {
  const target = await resolveAudioUrl(id, { forceRefresh: isRetry })

  let upstream
  try {
    upstream = await upstreamGet(target, range)
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`Upstream timeout (${HEADERS_TIMEOUT_MS} ms)`)
    throw err
  }

  const status = upstream.status

  // 403 → URL caducada/rechazada: invalidar caché y re-resolver una única vez.
  if (status === 403 && !isRetry) {
    await discardBody(upstream)
    invalidateAudioUrl(id)
    return streamOnce(id, range, req, res, true)
  }

  if (status >= 400) {
    await discardBody(upstream)
    const err = new Error(`Google respondió HTTP ${status} al resolver el audio`)
    err.code = 'EUPSTREAM'
    throw err
  }

  res.writeHead(status, passHeaders(upstream.headers, status))
  if (upstream.body) {
    const nodeStream = Readable.fromWeb(upstream.body)
    nodeStream.on('error', () => res.destroy())
    res.on('close', () => nodeStream.destroy())
    nodeStream.pipe(res)
  } else {
    res.end()
  }
  return true
}

async function handleRequest(req, res) {
  let u
  try {
    u = new URL(req.url, 'http://127.0.0.1')
  } catch {
    res.writeHead(400).end('Bad request')
    return
  }

  if (u.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  const match = u.pathname.match(/^\/stream\/([A-Za-z0-9_-]{11})\/?$/)
  if (!match) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'not_found' }))
    return
  }

  const id = match[1]
  const range = req.headers.range // p. ej. bytes=0- / bytes=12345-

  try {
    await streamOnce(id, range, req, res, false)
  } catch (err) {
    console.error('[turtune:proxy]', err?.message ?? err)
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({
          error: 'stream_unavailable',
          message: String(err?.message ?? err).slice(0, 300),
        }),
      )
    } else {
      res.destroy()
    }
  }
}

/**
 * Arranca el proxy en 127.0.0.1 con puerto aleatorio.
 * @returns {Promise<{ server: http.Server, port: number }>}
 */
function startProxy() {
  return new Promise((resolve, reject) => {
    if (server) {
      resolve({ server, port })
      return
    }
    server = http.createServer((req, res) => {
      handleRequest(req, res).catch(() => {
        try {
          res.destroy()
        } catch {
          /* noop */
        }
      })
    })
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port
      console.log(`[turtune:proxy] audio proxy escuchando en http://127.0.0.1:${port}`)
      resolve({ server, port })
    })
  })
}

function stopProxy() {
  if (server) server.close()
  server = null
  port = 0
}

function getPort() {
  return port
}

module.exports = { startProxy, stopProxy, getPort, handleRequest }
