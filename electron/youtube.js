'use strict'

/**
 * youtube.js — YouTube Data API v3 (solo lectura) SIN dependencias de Electron.
 * Todas las funciones reciben el accessToken; google.js gestiona OAuth/refresh.
 * Scope requerido: https://www.googleapis.com/auth/youtube.readonly
 */

const API = 'https://www.googleapis.com/youtube/v3'

/** ISO 8601 duración (PT1H2M13S) → segundos. Devuelve null si no parsea. */
function parseISO8601Duration(value) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(value ?? ''))
  if (!m) return null
  const [, d, h, min, s] = m
  const days = Number(d || 0), hours = Number(h || 0), mins = Number(min || 0), secs = Number(s || 0)
  return days * 86400 + hours * 3600 + mins * 60 + secs
}

async function apiGet(path, accessToken, params) {
  const url = new URL(`${API}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  let body = null
  try { body = await res.json() } catch { /* sin cuerpo */ }
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason ?? body?.error?.message ?? `HTTP ${res.status}`
    const err = new Error(`YouTube API: ${reason}`)
    err.code = res.status === 403 && /quota/i.test(String(reason)) ? 'EQUOTA' : 'EAPI'
    err.status = res.status
    throw err
  }
  return body
}

/** Normaliza un item de playlistItems → Track. */
function normalizePlaylistItem(item, duration = null) {
  const id = item?.contentDetails?.videoId ?? item?.snippet?.resourceId?.videoId
  if (!id) return null
  const sn = item?.snippet ?? {}
  const channel = sn.videoOwnerChannelTitle ?? sn.channelTitle ?? 'Canal desconocido'
  const thumb =
    sn?.thumbnails?.medium?.url ??
    sn?.thumbnails?.default?.url ??
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  const title = sn.title && sn.title !== 'Deleted video' && sn.title !== 'Private video'
    ? sn.title
    : null
  if (!title) return null
  return {
    id,
    title,
    artist: channel,
    channelTitle: channel,
    thumbnail: thumb,
    duration,
  }
}

/** Normaliza un item de playlists → tarjeta de biblioteca. */
function normalizePlaylist(item) {
  const id = item?.id
  if (!id) return null
  return {
    id,
    title: item?.snippet?.title ?? 'Playlist sin nombre',
    channelTitle: item?.snippet?.channelTitle ?? '',
    itemCount: item?.contentDetails?.itemCount ?? 0,
    thumbnail:
      item?.snippet?.thumbnails?.medium?.url ??
      item?.snippet?.thumbnails?.default?.url ??
      '',
  }
}

/** Lista las playlists del usuario autenticado (todas las páginas). */
async function listMyPlaylists(accessToken, maxPages = 2) {
  const out = []
  let pageToken
  for (let page = 0; page < maxPages; page++) {
    const data = await apiGet('playlists', accessToken, {
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: 50,
      fields: 'items(id,snippet(title,channelTitle,thumbnails/default/url,thumbnails/medium/url),contentDetails(itemCount)),nextPageToken',
      ...(pageToken ? { pageToken } : {}),
    })
    for (const item of data?.items ?? []) {
      const p = normalizePlaylist(item)
      if (p) out.push(p)
    }
    pageToken = data?.nextPageToken
    if (!pageToken) break
  }
  return out
}

/** Datos básicos del canal del usuario (para mostrar "Cuenta vinculada: Canal X"). */
async function getMyChannel(accessToken) {
  const data = await apiGet('channels', accessToken, {
    part: 'snippet',
    mine: 'true',
    maxResults: 1,
    fields: 'items(snippet(title,thumbnails/default/url))',
  })
  const ch = data?.items?.[0]?.snippet
  return ch ? { title: ch.title ?? 'Mi canal', thumbnail: ch.thumbnails?.default?.url ?? '' } : null
}

/** Items (videoIds) de una playlist, paginados. */
async function listPlaylistItems(accessToken, playlistId, maxItems = 200) {
  const out = []
  let pageToken
  while (out.length < maxItems) {
    const data = await apiGet('playlistItems', accessToken, {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: 50,
      fields: 'items(contentDetails/videoId,snippet(title,channelTitle,videoOwnerChannelTitle,thumbnails/default/url,thumbnails/medium/url)),nextPageToken',
      ...(pageToken ? { pageToken } : {}),
    })
    for (const item of data?.items ?? []) out.push(item)
    pageToken = data?.nextPageToken
    if (!pageToken) break
  }
  return out.slice(0, maxItems)
}

/** Duración en segundos para videoIds (lotes de 50, 1 unidad por lote). */
async function fetchVideoDurations(accessToken, ids) {
  const map = new Map()
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const data = await apiGet('videos', accessToken, {
      part: 'contentDetails',
      id: batch.join(','),
      fields: 'items(id,contentDetails/duration)',
    })
    for (const item of data?.items ?? []) {
      const secs = parseISO8601Duration(item?.contentDetails?.duration)
      if (secs != null) map.set(item.id, secs)
    }
  }
  return map
}

/**
 * Devuelve los tracks normalizados de una playlist (metadatos + duración).
 * @param {string} accessToken
 * @param {string} playlistId
 * @param {{ maxItems?: number }} [opts]
 */
async function getPlaylistTracks(accessToken, playlistId, { maxItems = 200 } = {}) {
  const items = await listPlaylistItems(accessToken, playlistId, maxItems)
  const ids = items.map((i) => i?.contentDetails?.videoId).filter(Boolean)
  const durations = await fetchVideoDurations(accessToken, ids)
  return items
    .map((item) => normalizePlaylistItem(item, durations.get(item?.contentDetails?.videoId) ?? null))
    .filter(Boolean)
}

module.exports = {
  parseISO8601Duration,
  normalizePlaylistItem,
  normalizePlaylist,
  listMyPlaylists,
  getMyChannel,
  getPlaylistTracks,
}
