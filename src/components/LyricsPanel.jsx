import { useEffect, useState, useRef } from 'react'

/**
 * Letras sincronizadas vÃ­a lrclib.net (API gratuita, sin key).
 * Muestra las letras con scroll automÃ¡tico segÃºn currentTime.
 */
export default function LyricsPanel({ track, currentTime }) {
  const [lines, setLines] = useState(null) // array of { time, text } | null (loading) | [] (none)
  const [error, setError] = useState(false)
  const containerRef = useRef(null)
  const activeRef = useRef(null)

  useEffect(() => {
    if (!track?.title) { setLines([]); return }
    let cancelled = false
    setLines(null)
    setError(false)

    const params = new URLSearchParams({
      track_name: track.title,
      artist_name: track.artist || '',
    })
    fetch(`https://lrclib.net/api/get?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        const synced = data?.syncedLyrics
        if (synced) {
          const parsed = parseLrc(synced)
          setLines(parsed.length ? parsed : [])
        } else if (data?.plainLyrics) {
          setLines(data.plainLyrics.split('\n').map((t, i) => ({ time: i * 4, text: t })))
        } else {
          setLines([])
        }
      })
      .catch(() => { if (!cancelled) { setError(true); setLines([]) } })
    return () => { cancelled = true }
  }, [track?.id, track?.title, track?.artist])

  // Auto-scroll to active line
  useEffect(() => {
    if (!lines || lines.length === 0 || !activeRef.current || !containerRef.current) return
    const container = containerRef.current
    const active = activeRef.current
    const top = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2
    container.scrollTo({ top, behavior: 'smooth' })
  }, [currentTime, lines])

  if (lines === null) {
    return (
      <div className="flex items-center justify-center py-8 text-[12px] text-[#8ca0af]">
        Buscando letrasâ€¦
      </div>
    )
  }
  if (error) {
    return (
      <div className="py-8 text-center text-[12px] text-[#8ca0af]">
        No se pudieron cargar las letras.
      </div>
    )
  }
  if (lines.length === 0) {
    return (
      <div className="py-8 text-center text-[12px] text-[#8ca0af]">
        No hay letras disponibles para esta canciÃ³n.
      </div>
    )
  }

  // Find active line index
  let activeIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) activeIndex = i
    else break
  }

  return (
    <div
      ref={containerRef}
      className="max-h-64 overflow-y-auto px-2 py-4 text-center"
    >
      {lines.map((l, i) => (
        <p
          key={i}
          ref={i === activeIndex ? activeRef : null}
          className={`my-1.5 text-[13px] leading-relaxed transition-all duration-300 ${
            i === activeIndex
              ? 'scale-105 font-bold text-[#15d3a2]'
              : i < activeIndex
              ? 'text-[#5f7280]'
              : 'text-[#8ca0af]'
          }`}
        >
          {l.text || 'â™ª'}
        </p>
      ))}
    </div>
  )
}

function parseLrc(lrc) {
  const out = []
  const re = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)/
  for (const raw of lrc.split('\n')) {
    const m = raw.match(re)
    if (!m) continue
    const min = parseInt(m[1], 10)
    const sec = parseInt(m[2], 10)
    const ms = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0
    const time = min * 60 + sec + ms / 1000
    out.push({ time, text: m[4] })
  }
  return out.sort((a, b) => a.time - b.time)
}
