'use strict'

/**
 * core.test.js — Tests de humo del backend (sin red, sin Electron).
 * Ejecutar: npm test
 */

const test = require('node:test')
const assert = require('node:assert/strict')

const { normalizeEntry, VIDEO_ID } = require('../electron/core/search')
const { parseExpire } = require('../electron/core/resolver')
const { importPlaylist } = require('../electron/core/playlist')
const { startProxy, stopProxy, getPort } = require('../electron/core/proxy')

test('VIDEO_ID acepta IDs válidos y rechaza otros', () => {
  assert.ok(VIDEO_ID.test('4VR-6AS0-l4'))
  assert.ok(VIDEO_ID.test('dQw4w9WgXcQ'))
  assert.equal(VIDEO_ID.test('short'), false)
  assert.equal(VIDEO_ID.test('4VR-6AS0-l4<script>'), false)
  assert.equal(VIDEO_ID.test(''), false)
})

test('normalizeEntry normaliza un resultado plano de yt-dlp', () => {
  const entry = normalizeEntry({
    id: '4VR-6AS0-l4',
    title: 'Nuvole Bianche',
    channel: 'Rousseau',
    duration: 400.6,
  })
  assert.equal(entry.id, '4VR-6AS0-l4')
  assert.equal(entry.title, 'Nuvole Bianche')
  assert.equal(entry.artist, 'Rousseau')
  assert.equal(entry.channelTitle, 'Rousseau')
  assert.equal(entry.duration, 401)
  assert.match(entry.thumbnail, /^https:\/\/i\.ytimg\.com\/vi\/4VR-6AS0-l4\/hqdefault\.jpg$/)
})

test('normalizeEntry usa uploader como fallback de canal', () => {
  const entry = normalizeEntry({ id: 'dQw4w9WgXcQ', title: 'X', uploader: 'Canal X' })
  assert.equal(entry.artist, 'Canal X')
})

test('normalizeEntry devuelve null para IDs inválidos', () => {
  assert.equal(normalizeEntry({ id: '../../etc/passwd', title: 'x' }), null)
  assert.equal(normalizeEntry({ title: 'sin id' }), null)
  assert.equal(normalizeEntry(null), null)
})

test('normalizeEntry tolera campos ausentes', () => {
  const entry = normalizeEntry({ id: 'dQw4w9WgXcQ' })
  assert.equal(entry.title, 'Sin título')
  assert.equal(entry.artist, 'Canal desconocido')
  assert.equal(entry.duration, null)
})

test('parseExpire extrae epoch (ms) del parámetro expire', () => {
  const url = 'https://rr1.googlevideo.com/videoplayback?expire=1793823956&x=y'
  assert.equal(parseExpire(url), 1793823956 * 1000)
  assert.equal(parseExpire('https://example.com/no-expire'), null)
  assert.equal(parseExpire('no-es-url'), null)
})

test('importPlaylist rechaza URLs ajenas o sin list=sin tocar la red', async () => {
  await assert.rejects(() => importPlaylist('no-es-una-url'), /URL no es válida/)
  await assert.rejects(() => importPlaylist('https://example.com/list=PL123'), /playlist pública/)
  await assert.rejects(
    () => importPlaylist('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    /playlist/,
  )
  await assert.rejects(() => importPlaylist(''), /Pega una URL/)
})

test('proxy expone /health y 404 en rutas inválidas', async () => {
  const { port } = await startProxy()
  assert.ok(port > 0 && getPort() === port)

  const health = await fetch(`http://127.0.0.1:${port}/health`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { ok: true })

  const badId = await fetch(`http://127.0.0.1:${port}/stream/corto`)
  assert.equal(badId.status, 404)

  const notFound = await fetch(`http://127.0.0.1:${port}/nope`)
  assert.equal(notFound.status, 404)

  stopProxy()
})
