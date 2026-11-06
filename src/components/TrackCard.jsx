import { Play, Pause, Loader2, Heart, ListPlus } from 'lucide-react'
import Thumb from './Thumb'
import { formatDuration } from '../lib/format'
import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'
import { playTrack, togglePlay } from '../audio/engine'

/** Puntos ecualizador animado cuando la pista está sonando. */
function EqBars({ paused }) {
  return (
    <div className={`flex h-4 items-end gap-[2px] ${paused ? 'eq-paused' : ''}`} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="eq-bar h-full w-[3px]" />
      ))}
    </div>
  )
}

/**
 * Tarjeta de pista (grid) estilo Spotify: carátula cuadrada, hover → overlay +
 * botón play verde, duración en badge, truncado de título, autor debajo.
 */
export default function TrackCard({ track, context }) {
  const current = usePlayerStore((s) => s.current)
  const playbackState = usePlayerStore((s) => s.playbackState)
  const liked = usePlayerStore((s) => s.liked)
  const toggleLike = usePlayerStore((s) => s.toggleLike)
  const addToQueue = usePlayerStore((s) => s.addToQueue)

  const isCurrent = current?.id === track.id
  const isPlaying = isCurrent && playbackState === PLAYBACK.PLAYING
  const isLoading = isCurrent && playbackState === PLAYBACK.LOADING
  const isLiked = liked.some((t) => t.id === track.id)

  const onPrimary = () => {
    if (isCurrent) togglePlay()
    else playTrack(track, context)
  }

  return (
    <div className="group relative rounded-xl border border-white/[0.05] bg-[#141f22] p-4 card-lift hover:border-white/[0.09] hover:bg-[#18262a]">
      {/* Carátula + acción principal */}
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-lg shadow-card">
        <Thumb src={track.thumbnail} alt={`Carátula de ${track.title}`} className="h-full w-full" iconSize={44} />
        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white/90 backdrop-blur-sm">
          {formatDuration(track.duration)}
        </span>

        {/* Overlay de acciones (hover / foco) */}
        <div
          className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/10 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100"
        >
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => toggleLike(track)}
              aria-label={isLiked ? 'Quitar de Me gusta' : 'Añadir a Me gusta'}
              aria-pressed={isLiked}
              className="rounded-full bg-black/55 p-1.5 text-white/85 backdrop-blur-sm transition hover:scale-110 hover:text-white"
            >
              <Heart size={16} fill={isLiked ? '#15d3a2' : 'transparent'} strokeWidth={isLiked ? 0 : 2} className={isLiked ? 'text-[#15d3a2]' : ''} />
            </button>
            <button
              type="button"
              onClick={() => addToQueue(track)}
              aria-label="Añadir a la cola"
              title="Añadir a la cola"
              className="rounded-full bg-black/55 p-1.5 text-white/85 backdrop-blur-sm transition hover:scale-110 hover:text-white"
            >
              <ListPlus size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={onPrimary}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            className="mb-0.5 grid h-12 w-12 translate-y-2 place-items-center rounded-full bg-[#15d3a2] text-black shadow-card transition-all duration-200 hover:scale-105 hover:bg-[#4fe3b7] focus-visible:translate-y-0 group-hover:translate-y-0"
          >
            {isLoading ? (
              <Loader2 size={22} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" className="ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Metadatos */}
      <button type="button" onClick={onPrimary} className="block w-full text-left">
        <p
          className={`truncate text-[15px] font-bold leading-snug ${isCurrent ? 'text-[#15d3a2]' : 'text-white'}`}
          title={track.title}
        >
          {track.title}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-[#8ca0af]" title={track.artist}>
          {track.artist}
        </p>
      </button>

      {/* Indicador "sonando" */}
      {isCurrent && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/60 px-1.5 py-1 backdrop-blur-sm">
          <EqBars paused={!isPlaying} />
        </div>
      )}
    </div>
  )
}
