import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, LayoutGrid, List, Loader2, AlertCircle, Clock3, X, Play, Pause, ListMusic, History,
} from '../lib/icons'
import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'
import { searchBackend } from '../lib/api'
import { playTrack, togglePlay } from '../audio/engine'
import TrackCard from './TrackCard'
import TrackRow from './TrackRow'
import Thumb from './Thumb'
import { formatDuration } from '../lib/format'

const GENRES = [
  { label: 'Pop', query: 'top 40 pop hits' },
  { label: 'Reggaetón', query: 'reggaeton hits' },
  { label: 'Hip-hop', query: 'hip hop hits' },
  { label: 'Trap latino', query: 'trap latino' },
  { label: 'Electrónica', query: 'dance pop hits' },
  { label: 'Rock', query: 'rock en español hits' },
  { label: 'Baladas', query: 'baladas románticas' },
  { label: 'Corridos tumbados', query: 'corridos tumbados' },
]

const DEBOUNCE_MS = 400

export default function SearchView() {
  const query = usePlayerStore((s) => s.query)
  const setQuery = usePlayerStore((s) => s.setQuery)
  const recentSearches = usePlayerStore((s) => s.recentSearches)
  const removeRecentSearch = usePlayerStore((s) => s.removeRecentSearch)
  const addRecentSearch = usePlayerStore((s) => s.addRecentSearch)

  const [debounced, setDebounced] = useState('')
  const [retryTick, setRetryTick] = useState(0)
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [layout, setLayout] = useState('grid') // 'grid' | 'list'
  const reqId = useRef(0)

  // Debounce 400 ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  // Fetch con cancelación por secuencia (ignora respuestas fuera de orden)
  useEffect(() => {
    if (!debounced) {
      setStatus('idle')
      setItems([])
      setError('')
      return
    }
    const id = ++reqId.current
    setStatus('loading')
    setError('')

    searchBackend(debounced)
      .then((res) => {
        if (id !== reqId.current) return
        if (res?.ok) {
          setItems(res.items)
          setStatus('success')
          if (res.items.length) addRecentSearch(debounced)
        } else {
          setItems([])
          setError(res?.error ?? 'No se pudo completar la búsqueda.')
          setStatus('error')
        }
      })
      .catch((err) => {
        if (id !== reqId.current) return
        setItems([])
        setError(String(err?.message ?? err))
        setStatus('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, retryTick])

  const top = items[0] ?? null
  const rest = useMemo(() => items.slice(1), [items])

  return (
    <div className="scroll-area h-full overflow-y-auto px-6 pb-8 pt-5">
      {status === 'idle' && (
        <IdleState
          recentSearches={recentSearches}
          onPick={setQuery}
          onRemoveRecent={removeRecentSearch}
        />
      )}

      {status === 'loading' && <LoadingSkeleton query={debounced} />}

      {status === 'error' && (
        <ErrorState
          message={error}
          onRetry={() => setRetryTick((t) => t + 1)}
        />
      )}

      {status === 'success' && (
        <>
          {/* Encabezado de resultados */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#15d3a2]">
                Resultados de audio
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
                “{debounced}”
                <span className="ml-3 align-middle text-sm font-semibold text-[#8ca0af]">
                  {items.length} pistas
                </span>
              </h1>
            </div>
            <LayoutToggle layout={layout} onChange={setLayout} />
          </div>

          {items.length === 0 ? (
            <div className="mt-16 flex flex-col items-center gap-4 text-center">
              <Search size={40} className="text-[#2e3a46]" strokeWidth={1.5} />
              <div>
                <p className="text-lg font-bold text-white">Sin resultados</p>
                <p className="mt-1 max-w-md text-sm text-[#8ca0af]">
                  Prueba con otro artista, canción o estilo. La búsqueda usa el índice de YouTube.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Mejor resultado + canciones top */}
              {top && (
                <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(300px,5fr)_7fr]">
                  <TopResult track={top} context={items} />
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <h2 className="px-1 text-[15px] font-extrabold text-white">Canciones</h2>
                    <ol className="mt-1 divide-y divide-white/5">
                      {rest.slice(0, 4).map((track, i) => (
                        <MiniRow key={track.id} track={track} index={i} context={items} />
                      ))}
                    </ol>
                  </div>
                </section>
              )}

              {/* Resultados completos */}
              <section className="mt-6">
                {layout === 'grid' ? (
                  <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {items.map((track) => (
                      <TrackCard key={track.id} track={track} context={items} />
                    ))}
                  </div>
                ) : (
                  <div role="table" aria-label="Resultados en lista" className="rounded-xl bg-white/[0.02] p-2">
                    <div
                      aria-hidden
                      className="grid grid-cols-[2rem_minmax(0,1fr)_2rem_3.5rem_2.5rem] gap-3 border-b border-white/5 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#72868f]"
                    >
                      <span className="text-center">#</span>
                      <span>Título</span>
                      <span />
                      <span className="text-right">
                        <Clock3 size={13} className="ml-auto" aria-label="Duración" />
                      </span>
                      <span />
                    </div>
                    {items.map((track, i) => (
                      <TrackRow key={track.id} track={track} index={i} context={items} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ---------------- Subcomponentes ---------------- */

function LayoutToggle({ layout, onChange }) {
  const btn = (id, label, Icon) => (
    <button
      type="button"
      role="radio"
      aria-checked={layout === id}
      aria-label={label}
      title={label}
      onClick={() => onChange(id)}
      className={`grid h-9 w-9 place-items-center rounded-full transition ${
        layout === id ? 'bg-white text-black' : 'text-[#8ca0af] hover:text-white'
      }`}
    >
      <Icon size={18} />
    </button>
  )
  return (
    <div role="radiogroup" aria-label="Cambiar disposición" className="flex items-center gap-1 rounded-full bg-black/40 p-1">
      {btn('grid', 'Vista cuadrícula', LayoutGrid)}
      {btn('list', 'Vista lista', List)}
    </div>
  )
}

function IdleState({ recentSearches, onPick, onRemoveRecent }) {
  return (
    <>
      {recentSearches.length > 0 && (
        <section aria-label="Búsquedas recientes">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[16px] font-extrabold tracking-tight text-white">
              <History size={16} className="text-[#15d3a2]" aria-hidden /> Recientes
            </h2>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recentSearches.map((q) => (
              <li key={q} className="group flex items-center overflow-hidden rounded-full bg-[#1e2c31]">
                <button
                  type="button"
                  onClick={() => onPick(q)}
                  className="py-2 pl-4 pr-2 text-[13px] font-semibold text-white/90 transition hover:text-white"
                >
                  {q}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveRecent(q)}
                  aria-label={`Eliminar “${q}” de recientes`}
                  className="mr-1.5 rounded-full p-1 text-[#72868f] transition hover:bg-white/10 hover:text-white"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Explorar géneros" className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-[19px] font-extrabold tracking-tight text-white">
          <ListMusic size={17} className="text-[#15d3a2]" aria-hidden /> Explorar géneros
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {GENRES.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => onPick(g.query)}
              className="group relative h-24 overflow-hidden rounded-xl border border-white/5 bg-[#141f22] text-left transition-colors hover:border-[#15d3a2]/40 hover:bg-[#18261f]"
            >
              <span className="absolute left-4 top-4 text-base font-extrabold text-white/90 transition-colors group-hover:text-white">
                {g.label}
              </span>
              <span
                aria-hidden
                className="absolute bottom-3 left-4 h-0.5 w-8 rounded-full bg-[#15d3a2]/50 transition-all duration-300 group-hover:w-14 group-hover:bg-[#15d3a2]"
              />
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

function LoadingSkeleton({ query }) {
  return (
    <div aria-busy="true" aria-label={`Buscando ${query}`}>
      <div className="flex items-center gap-3 text-[#8ca0af]">
        <Loader2 size={18} className="animate-spin text-[#15d3a2]" aria-hidden />
        <p className="text-sm font-semibold">Buscando “{query}” en YouTube…</p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#141f22] p-3.5">
            <div className="shimmer aspect-square w-full rounded-lg" />
            <div className="shimmer mt-3 h-4 w-4/5 rounded" />
            <div className="shimmer mt-2 h-3 w-3/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="mt-16 flex flex-col items-center gap-4 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-[#2a1215]">
        <AlertCircle size={30} className="text-[#f87171]" aria-hidden />
      </span>
      <div>
        <p className="text-lg font-bold text-white">No se pudo completar la búsqueda</p>
        <p className="mt-1 max-w-md text-sm text-[#8ca0af]">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-white/20 px-6 py-2 text-sm font-bold text-white transition hover:scale-105 hover:border-white"
      >
        Reintentar
      </button>
    </div>
  )
}

function TopResult({ track, context }) {
  const current = usePlayerStore((s) => s.current)
  const playbackState = usePlayerStore((s) => s.playbackState)
  const isCurrent = current?.id === track.id
  const isPlaying = isCurrent && playbackState === PLAYBACK.PLAYING

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#17231f] p-5">
      <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#7ee7f8]">Mejor resultado</p>
      <Thumb
        src={track.thumbnail}
        alt={`Carátula de ${track.title}`}
        className="mt-4 h-36 w-36 rounded-xl shadow-card"
        iconSize={48}
      />
      <h3 className="mt-4 line-clamp-2 text-3xl font-black leading-tight tracking-tight text-white" title={track.title}>
        {track.title}
      </h3>
      <p className="mt-1.5 text-sm font-semibold text-[#b9d8de]">
        Canción · <span className="text-white">{track.artist}</span>
        {track.duration != null && (
          <span className="tabular-nums text-[#5fb3c8]"> · {formatDuration(track.duration)}</span>
        )}
      </p>
      <button
        type="button"
        onClick={() => (isCurrent ? togglePlay() : playTrack(track, context))}
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        className="absolute bottom-5 right-5 grid h-14 w-14 place-items-center rounded-full bg-[#15d3a2] text-black shadow-card transition hover:scale-105 hover:bg-[#4fe3b7]"
      >
        {isPlaying ? (
          <Pause size={26} fill="currentColor" />
        ) : (
          <Play size={26} fill="currentColor" className="ml-0.5" />
        )}
      </button>
    </div>
  )
}

function MiniRow({ track, index, context }) {
  const playbackState = usePlayerStore((s) => s.playbackState)
  const current = usePlayerStore((s) => s.current)
  const isCurrent = current?.id === track.id
  const isPlaying = isCurrent && playbackState === PLAYBACK.PLAYING

  return (
    <li>
      <button
        type="button"
        onClick={() => (isCurrent ? togglePlay() : playTrack(track, context))}
        className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-white/[0.06]"
        aria-label={`${isPlaying ? 'Pausar' : 'Reproducir'} ${track.title}`}
      >
        <span className="w-5 text-center text-xs tabular-nums text-[#72868f]">{index + 1}</span>
        <Thumb src={track.thumbnail} alt="" className="h-12 w-12 rounded-md" iconSize={20} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[13px] font-semibold ${isCurrent ? 'text-[#15d3a2]' : 'text-white'}`} title={track.title}>
            {track.title}
          </span>
          <span className="block truncate text-[11.5px] text-[#8ca0af]">{track.artist}</span>
        </span>
        <span className="text-[11px] tabular-nums text-[#72868f]">{formatDuration(track.duration)}</span>
      </button>
    </li>
  )
}
