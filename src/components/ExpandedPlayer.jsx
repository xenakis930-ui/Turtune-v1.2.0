import { X, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, ListMusic, Volume2, Volume1, VolumeX } from '../lib/icons'
import Thumb from './Thumb'
import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'
import { togglePlay, next, previous, seekTo, setVolume, toggleMute } from '../audio/engine'
import { formatTime } from '../lib/format'

/** Vista expandida del reproductor — modal full-screen con carátula gigante. */
export default function ExpandedPlayer() {
  const open = usePlayerStore((s) => s.expandedPlayer)
  const setExpandedPlayer = usePlayerStore((s) => s.setExpandedPlayer)
  const current = usePlayerStore((s) => s.current)
  const playbackState = usePlayerStore((s) => s.playbackState)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const muted = usePlayerStore((s) => s.muted)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat)
  const toggleMute = usePlayerStore((s) => s.toggleMute)
  const queue = usePlayerStore((s) => s.queue)
  const index = usePlayerStore((s) => s.index)

  if (!open || !current) return null

  const effectiveDuration = duration > 0 ? duration : (current?.duration ?? 0)
  const pct = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0
  const isPlaying = playbackState === PLAYBACK.PLAYING
  const isLoading = playbackState === PLAYBACK.LOADING
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reproductor expandido"
      className="fixed inset-0 z-[60] flex flex-col bg-[#0a0f14]/95 backdrop-blur-xl"
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between px-6 pt-6">
        <button
          type="button"
          onClick={() => setExpandedPlayer(false)}
          aria-label="Cerrar vista expandida"
          className="rounded-full p-2 text-[#8ca0af] transition hover:bg-white/5 hover:text-white"
        >
          <X size={24} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8ca0af]">
          Reproductor expandido
        </p>
        <div className="w-10" aria-hidden />
      </div>

      {/* Carátula + info */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4">
        <Thumb
          src={current.thumbnail}
          alt={`Carátula de ${current.title}`}
          className="h-64 w-64 rounded-2xl shadow-card sm:h-80 sm:w-80"
          iconSize={80}
        />
        <div className="w-full max-w-md text-center">
          <h2 className="line-clamp-2 text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
            {current.title}
          </h2>
          <p className="mt-2 text-[14px] font-semibold text-[#8ca0af]">{current.artist}</p>
        </div>

        {/* Seekbar */}
        <div className="flex w-full max-w-md items-center gap-3 text-[12px] tabular-nums text-[#8ca0af]">
          <span className="w-10 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(effectiveDuration))}
            step={1}
            value={Math.min(currentTime, effectiveDuration || currentTime)}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Buscar en la canción"
            className="oct-range flex-1"
            style={{ '--fill': `${pct}%`, '--buffer': `${pct}%` }}
            disabled={!current}
          />
          <span className="w-10">{effectiveDuration > 0 ? formatTime(effectiveDuration) : '–:–'}</span>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            aria-label="Aleatorio"
            className={`transition hover:scale-110 ${shuffle ? 'text-[#15d3a2]' : 'text-[#8ca0af] hover:text-white'}`}
          >
            <Shuffle size={20} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={previous}
            disabled={!current}
            aria-label="Anterior"
            className="text-[#8ca0af] transition hover:scale-110 hover:text-white disabled:opacity-30"
          >
            <SkipBack size={26} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!current}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            className="grid h-16 w-16 place-items-center rounded-full bg-white text-black transition hover:scale-105 hover:bg-[#f0f0f0] disabled:opacity-30"
          >
            {isLoading ? (
              <Loader2 size={28} className="animate-spin" aria-hidden />
            ) : isPlaying ? (
              <Pause size={28} fill="currentColor" aria-hidden />
            ) : (
              <Play size={28} fill="currentColor" className="ml-1" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => next(false)}
            disabled={!current}
            aria-label="Siguiente"
            className="text-[#8ca0af] transition hover:scale-110 hover:text-white disabled:opacity-30"
          >
            <SkipForward size={26} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={cycleRepeat}
            aria-pressed={repeat !== 'off'}
            aria-label={repeat === 'one' ? 'Repetir una' : repeat === 'all' ? 'Repetir todo' : 'Repetir'}
            className={`transition hover:scale-110 ${repeat !== 'off' ? 'text-[#15d3a2]' : 'text-[#8ca0af] hover:text-white'}`}
          >
            <RepeatIcon size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* Volumen */}
        <div className="flex w-full max-w-xs items-center gap-3">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
            className="text-[#8ca0af] transition hover:text-white"
          >
            <VolumeIcon size={20} />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={muted ? 0 : Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            aria-label="Volumen"
            className="oct-range flex-1"
            style={{ '--fill': `${muted ? 0 : Math.round(volume * 100)}%` }}
          />
        </div>
      </div>

      {/* Cola (compacta) */}
      {queue.length > 1 && (
        <div className="border-t border-white/5 px-6 py-4">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8ca0af]">
            <ListMusic size={14} /> A continuación
          </p>
          <div className="scroll-area flex gap-3 overflow-x-auto pb-1">
            {queue.slice(index + 1, index + 6).map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setExpandedPlayer(false); /* playQueueIndex would be called but we close first */ }}
                className="w-32 shrink-0 overflow-hidden rounded-lg bg-white/[0.04] text-left transition hover:bg-white/[0.08]"
              >
                <Thumb src={t.thumbnail} alt="" className="aspect-square w-full" iconSize={24} />
                <p className="truncate px-2 py-1.5 text-[11px] font-semibold text-white" title={t.title}>
                  {t.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
