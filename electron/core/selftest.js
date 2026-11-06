'use strict'

/**
 * selftest.js — Smoke test del núcleo (sin Electron): busca y resuelve audio.
 * Uso: npm run selftest -- "nuvole bianche"
 */

const { searchTracks } = require('./search')
const { resolveAudioUrl } = require('./resolver')

;(async () => {
  const q = process.argv.slice(2).join(' ') || 'nuvole bianche'
  console.log(`[selftest] buscando: ${q}`)
  const t0 = Date.now()
  const items = await searchTracks(q, 5)
  console.log(`[selftest] ${items.length} resultados en ${Date.now() - t0} ms`)
  for (const it of items) {
    console.log(`  - ${it.title} | ${it.artist} | ${it.duration ?? '--'}s | ${it.id}`)
  }
  if (items[0]) {
    const t1 = Date.now()
    const url = await resolveAudioUrl(items[0].id)
    console.log(`[selftest] stream resuelto en ${Date.now() - t1} ms: ${url.slice(0, 80)}...`)
  } else {
    process.exitCode = 1
  }
})().catch((err) => {
  console.error('[selftest] ERROR:', err)
  process.exitCode = 1
})
