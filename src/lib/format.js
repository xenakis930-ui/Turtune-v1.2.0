/** Utilidades de formato de tiempo y texto. */

/** Segundos → "m:ss" o "h:mm:ss" (o fallback si no hay dato). */
export function formatTime(totalSeconds, fallback = '0:00') {
  const s = Number(totalSeconds)
  if (!Number.isFinite(s) || s < 0) return fallback
  const sec = Math.floor(s % 60)
  const min = Math.floor((s / 60) % 60)
  const hours = Math.floor(s / 3600)
  const mm = hours > 0 ? String(min).padStart(2, '0') : String(min)
  const ss = String(sec).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Duración de track (puede ser null) → "3:47" o "–:–". */
export function formatDuration(duration) {
  if (duration == null || !Number.isFinite(Number(duration))) return '–:–'
  return formatTime(Number(duration))
}
