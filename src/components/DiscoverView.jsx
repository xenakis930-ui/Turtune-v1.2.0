import { useEffect, useState, useMemo } from 'react'
import { Compass, Sparkles, TrendingUp, Music2, Play, Pause, Loader2 } from '../lib/icons'
import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'
import { searchBackend } from '../lib/api'
import { playTrack, togglePlay } from '../audio/engine'
import TrackCard from './TrackCard'

const GENRES = [
  { label: 'Pop', query: 'top pop hits 2026' },
  { label: 'Reggaetón', query: 'reggaeton hits 2026' },
  { label: 'Hip-hop', query: 'hip hop top hits' },
  { label: 'Trap latino', query: 'trap latino hits' },
  { label: 'Electrónica', query: 'electronic dance hits' },
  { label: 'Rock', query: 'rock hits 2026' },
  { label: 'Baladas', query: 'baladas románticas' },
  { label: 'Corridos', query: 'corridos tumbados hits' },
  { label: 'K-Pop', query: 'k-pop top hits' },
  { label: 'Indie', query: 'indie alternative hits' },
  { label: 'R&B', query: 'r&b soul hits' },
  { label: 'Salsa', query: 'salsa hits' },
]

function Section({ title, icon: Icon, children, loading }) {
  return (
    <section aria-label={title} className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon size={18} className="text-[#15d3a2]" aria-hidden />}
        <h2 className="text-[21px] font-extrabold tracking-tight text-white">{title}</h2>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : (
        children
      )}
    </section>
  )
}

export default function DiscoverView() {
  const history = usePlayerStore((s) => s.history)
  const liked = usePlayerStore((s) => s.liked)
  const setQuery = usePlayerStore((s) => s.setQuery)
  const current = usePlayerStore((s) => s.current)
  const playbackState = usePlayerStore((s) => s.playbackState)

  const [trending, setTrending] = useState([])
  const [forYou, setForYou] = useState([])
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [loadingForYou, setLoadingForYou] = useState(true)
  const [activeGenre, setActiveGenre] = useState(null)
  const [genreTracks, setGenreTracks] = useState([])
  const [loadingGenre, setLoadingGenre] = useState(false)

  // Tendencias: búsqueda de hits actuales
  useEffect(() => {
    let cancelled = false
    setLoadingTrending(true)
    searchBackend('top hits 2026 music')
      .then((res) => {
        if (cancelled) return
        setTrending(res?.items ?? [])
      })
      .catch(() => { if (!cancelled) setTrending([]) })
      .finally(() => { if (!cancelled) setLoadingTrending(false) })
    return () => { cancelled = true }
  }, [])

  // Basado en lo que escuchas: derivar artistas de history + likes
  useEffect(() => {
    let cancelled = false
    setLoadingForYou(true)
    const artists = [...new Set(
      [...history.slice(0, 20), ...liked.slice(0, 20)]
        .map((t) => t?.artist)
        .filter(Boolean)
    )].slice(0, 4)

    if (artists.length === 0) {
      // Sin historial: mostrar algo genérico
      searchBackend('discover new music 2026')
        .then((res) => { if (!cancelled) setForYou(res?.items ?? []) })
        .catch(() => { if (!cancelled) setForYou([]) })
        .finally(() => { if (!cancelled) setLoadingForYou(false) })
      return () => { cancelled = true }
    }

    // Buscar tracks de cada artista en paralelo
    Promise.all(artists.map((a) => searchBackend(a).catch(() => ({ items: [] }))))
      .then((results) => {
        if (cancelled) return
        const seen = new Set()
        const merged = []
        for (const r of results) {
          for (const t of (r?.items ?? [])) {
            if (t?.id && !seen.has(t.id)) {
              seen.add(t.id)
              merged.push(t)
            }
          }
        }
        setForYou(merged.slice(0, 18))
      })
      .catch(() => { if (!cancelled) setForYou([]) })
      .finally(() => { if (!cancelled) setLoadingForYou(false) })
    return () => { cancelled = true }
  }, [history.length, liked.length])

  const handleGenre = (genre) => {
    setActiveGenre(genre)
    setLoadingGenre(true)
    setGenreTracks([])
    searchBackend(genre.query)
      .then((res) => setGenreTracks(res?.items ?? []))
      .catch(() => setGenreTracks([]))
      .finally(() => setLoadingGenre(false))
  }

  const playAll = (tracks) => {
    if (!tracks || tracks.length === 0) return
    playTrack(tracks[0], tracks)
  }

  return (
    <div className="scroll-area h-full overflow-y-auto px-6 pb-8 pt-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#15d3a2]/10">
          <Compass size={26} className="text-[#15d3a2]" aria-hidden />
        </div>
        <div>
          <h1 className="text-[28px] font-black tracking-tight text-white">
            Descubrir<span className="text-[#15d3a2]">.</span>
          </h1>
          <p className="text-[12px] text-[#8ca0af]">
            Música nueva basada en lo que escuchas
          </p>
        </div>
      </div>

      {/* Géneros */}
      <section aria-label="Géneros" className="mt-6">
        <div className="scroll-area -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {GENRES.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => handleGenre(g)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-[12.5px] font-bold transition-colors ${
                activeGenre?.label === g.label
                  ? 'border-[#15d3a2] bg-[#15d3a2]/15 text-[#15d3a2]'
                  : 'border-white/10 bg-white/[0.03] text-[#8ca0af] hover:border-[#15d3a2]/40 hover:text-white'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </section>

      {/* Resultado de género */}
      {activeGenre && (
        <Section title={activeGenre.label} icon={Music2} loading={loadingGenre}>
          {genreTracks.length === 0 && !loadingGenre ? (
            <p className="text-[13px] text-[#8ca0af]">Sin resultados.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {genreTracks.slice(0, 10).map((t) => (
                <TrackCard key={t.id} track={t} context={genreTracks} />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Basado en lo que escuchas */}
      <Section title="Basado en lo que escuchas" icon={Sparkles} loading={loadingForYou}>
        {forYou.length === 0 && !loadingForYou ? (
          <p className="text-[13px] text-[#8ca0af]">
            Escucha algunas canciones para obtener recomendaciones personalizadas.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-[#72868f]">
                {forYou.length} pistas de tus artistas favoritos
              </span>
              {forYou.length > 0 && (
                <button
                  type="button"
                  onClick={() => playAll(forYou)}
                  className="rounded-full bg-[#15d3a2]/10 px-3 py-1 text-[11px] font-bold text-[#15d3a2] transition hover:bg-[#15d3a2]/20"
                >
                  Reproducir todo
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {forYou.slice(0, 10).map((t) => (
                <TrackCard key={t.id} track={t} context={forYou} />
              ))}
            </div>
          </>
        )}
      </Section>

      {/* Tendencias */}
      <Section title="Tendencias" icon={TrendingUp} loading={loadingTrending}>
        {trending.length === 0 && !loadingTrending ? (
          <p className="text-[13px] text-[#8ca0af]">Sin resultados.</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-[#72868f]">
                {trending.length} pistas populares
              </span>
              {trending.length > 0 && (
                <button
                  type="button"
                  onClick={() => playAll(trending)}
                  className="rounded-full bg-[#15d3a2]/10 px-3 py-1 text-[11px] font-bold text-[#15d3a2] transition hover:bg-[#15d3a2]/20"
                >
                  Reproducir todo
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {trending.slice(0, 10).map((t) => (
                <TrackCard key={t.id} track={t} context={trending} />
              ))}
            </div>
          </>
        )}
      </Section>
    </div>
  )
}
EOF