/**
 * mock.js — Datos de demostración para vista previa en navegador (sin Electron).
 * Los IDs son vídeos musicales reales de YouTube (miniaturas reales).
 */

const t = (id, title, artist, duration) => ({
  id,
  title,
  artist,
  channelTitle: artist,
  duration,
  thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
})

export const DEMO_TRACKS = [
  t('4VR-6AS0-l4', 'Nuvole Bianche', 'Ludovico Einaudi', 401),
  t('kJQP7kiw5Fk', 'Despacito (feat. Daddy Yankee)', 'Luis Fonsi', 281),
  t('dQw4w9WgXcQ', 'Never Gonna Give You Up', 'Rick Astley', 213),
  t('9bZkp7q19f0', '강남스타일 (Gangnam Style)', 'PSY', 253),
  t('hTWKbfoikeg', 'Smells Like Teen Spirit', 'Nirvana', 301),
  t('OPf0YbXqDm0', 'Uptown Funk (feat. Bruno Mars)', 'Mark Ronson', 270),
  t('fJ9rUzIMcZQ', 'In the End', 'Linkin Park', 219),
  t('YQHsXMglC9A', 'Hello', 'Adele', 295),
  t('JGwWNGJdvx8', 'Shape of You', 'Ed Sheeran', 263),
  t('09R8_2nJtjg', 'Sugar', 'Maroon 5', 235),
  t('CevxZvSJLk8', 'Roar', 'Katy Perry', 228),
  t('DhtNFBepySM', 'Bella ciao', 'Manu Pilas', 201),
]

export function demoSearch(query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!q) return DEMO_TRACKS
  const hit = DEMO_TRACKS.filter(
    (tr) => tr.title.toLowerCase().includes(q) || tr.artist.toLowerCase().includes(q),
  )
  return hit.length ? hit : DEMO_TRACKS.slice(0, 8)
}
