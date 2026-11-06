'use strict'

/**
 * youtube.test.js — Tests del normalizador de la YouTube Data API v3 (sin red).
 */

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  parseISO8601Duration,
  normalizePlaylistItem,
  normalizePlaylist,
} = require('../electron/youtube')

test('parseISO8601Duration parsea PT#H#M#S', () => {
  assert.equal(parseISO8601Duration('PT45S'), 45)
  assert.equal(parseISO8601Duration('PT4M13S'), 253)
  assert.equal(parseISO8601Duration('PT1H2M13S'), 3733)
  assert.equal(parseISO8601Duration('PT2H'), 7200)
  assert.equal(parseISO8601Duration('PT1H2M3S'), 3723)
  assert.equal(parseISO8601Duration('P1DT2H'), 93600)
})

test('parseISO8601Duration rechaza basura', () => {
  assert.equal(parseISO8601Duration(''), null)
  assert.equal(parseISO8601Duration('nope'), null)
  assert.equal(parseISO8601Duration(null), null)
  assert.equal(parseISO8601Duration('4:13'), null)
})

test('normalizePlaylistItem mapea y descarta ids inválidos', () => {
  const item = {
    contentDetails: { videoId: 'dQw4w9WgXcQ' },
    snippet: {
      title: 'Never Gonna Give You Up',
      channelTitle: 'Rick Astley',
      videoOwnerChannelTitle: 'Rick Astley (Topic)',
      thumbnails: { medium: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg' } },
    },
  }
  const track = normalizePlaylistItem(item, 213)
  assert.equal(track.id, 'dQw4w9WgXcQ')
  assert.equal(track.title, 'Never Gonna Give You Up')
  assert.equal(track.artist, 'Rick Astley (Topic)')
  assert.equal(track.duration, 213)
  assert.match(track.thumbnail, /^https:/)

  assert.equal(normalizePlaylistItem({ snippet: {} }), null)
  assert.equal(normalizePlaylistItem({ contentDetails: { videoId: 'x'.repeat(11) }, snippet: { title: 'Private video' } }), null)
})

test('normalizePlaylistItem cae en thumbnail hqdefault si no hay', () => {
  const item = {
    contentDetails: { videoId: 'dQw4w9WgXcQ' },
    snippet: { title: 'X', channelTitle: 'Y' },
  }
  assert.match(normalizePlaylistItem(item).thumbnail, /hqdefault\.jpg$/)
})

test('normalizePlaylist mapea tarjeta de biblioteca', () => {
  const p = normalizePlaylist({
    id: 'PLtest123',
    snippet: {
      title: 'Mis favoritas',
      channelTitle: 'Yo',
      thumbnails: { default: { url: 'https://i.ytimg.com/vi/x/default.jpg' } },
    },
    contentDetails: { itemCount: 42 },
  })
  assert.equal(p.title, 'Mis favoritas')
  assert.equal(p.itemCount, 42)
  assert.match(p.thumbnail, /^https:/)
  assert.equal(normalizePlaylist({}), null)
})
