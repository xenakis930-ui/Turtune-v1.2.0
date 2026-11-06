import { useState } from 'react'
import { Play, Pause, Loader2, Heart, ListPlus } from 'lucide-react'
import Thumb from './Thumb'
import { formatDuration } from '../lib/format'
import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'
import { playTrack, togglePlay } from '../audio/engine'

/**
 * Fila de track para la vista de lista (estilo lista de Spotify):
 * índice | carátula | título/artista | me gusta | duración | añadir a cola.
 */
export default function TrackRow({ track, context, index, showHeader = true }) {
  const current = usePlayerStore((s) => s.current)
  const playbackState = usePlayerStore((s) => s.playbackState)
  const liked = usePlayerStore((s) => s.liked)
  const toggleLike = usePlayerStore((s) => s.toggleLike)
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const [hover, setHover] = useState(false)

  const isCurrent = current?.id === track.id
  const isPlaying = isCurrent && playbackState === PLAYBACK.PLAYING
  const isLoading = isCurrent && playbackState === PLAYBACK.LOADING
  const isLiked = liked.some((t) => t.id === track.id)

  const onPrimary = () => (isCurrent ? togglePlay() : playTrack(track, context))

  return (
    <div
      role="row"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => e.key === 'Enter' && onPrimary()}
      onDoubleClick={onPrimary}
      className="group grid grid-cols-[2rem_minmax(0,1fr)_2rem_3.5rem_2.5rem] items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-white/[0.07]"
    >
      {/* Índice / estado */}
      <button
        type="button"
        onClick={onPrimary}
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        className="grid h-8 w-8 place-items-center text-sm tabular-nums text-[#8ca0af]"
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin text-[#15d3a2]" />
        ) : hover || isCurrent ? (
          isPlaying ? (
            <Pause size={16} fill="currentColor" className="text-white" />
          ) : (
            <Play size={16} fill="currentColor" className="ml-0.5 text-white" />
          )
        ) : (
          <span className={isCurrent ? 'font-bold text-[#15d3a2]' : ''}>{index + 1}</span>
        )}
      </button>

      {/* Carátula + título/artista */}
      <button type="button" onClick={onPrimary} className="flex min-w-0 items-center gap-3 text-left">
        <Thumb
          src={track.thumbnail}
          alt={`Carátula de ${track.title}`}
          className="h-12 w-12 shrink-0 rounded-md"
          iconSize={20}
        />
        <span className="min-w-0">
          <span
            className={`block truncate text-[14.5px] font-semibold leading-tight ${
              isCurrent ? 'text-[#15d3a2]' : 'text-white'
            }`}
            title={track.title}
          >
            {track.title}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-[#8ca0af]" title={track.artist}>
            {track.artist}
          </span>
        </span>
      </button>

      {/* Me gusta */}
      <button
        type="button"
        onClick={() => toggleLike(track)}
        aria-label={isLiked ? 'Quitar de Me gusta' : 'Añadir a Me gusta'}
        aria-pressed={isLiked}
        className={`grid h-8 w-8 place-items-center rounded-full transition-all hover:scale-110 ${
          isLiked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
        }`}
      >
        <Heart
          size={17}
          fill={isLiked ? '#15d3a2' : 'transparent'}
          className={isLiked ? 'text-[#15d3a2]' : 'text-[#8ca0af] hover:text-white'}
        />
      </button>

      {/* Duración */}
      <span className="text-right text-[13px] tabular-nums text-[#8ca0af]">
        {formatDuration(track.duration)}
      </span>

      {/* Añadir a la cola */}
      <button
        type="button"
        onClick={() => addToQueue(track)}
        aria-label="Añadir a la cola"
        title="Añadir a la cola"
        className="grid h-8 w-8 place-items-center rounded-full text-[#8ca0af] opacity-0 transition-all hover:scale-110 hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
      >
        <ListPlus size={18} />
      </button>
    </div>
  )
}
