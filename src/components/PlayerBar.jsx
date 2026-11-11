import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Heart,
  Volume2, Volume1, VolumeX, ListMusic, Loader2, RotateCw, AudioLines, Keyboard,
} from '../lib/icons'
import Thumb from './Thumb'
import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'
import { togglePlay, next, previous, seekTo, setVolume, toggleMute } from '../audio/engine'
import { formatTime } from '../lib/format'

/**
 * Footer persistente estilo Spotify:
 *  [portada 56px · título · artista · me gusta] · [controles + seekbar] · [cola · volumen]
 */
export default function PlayerBar() {
  const current = usePlayerStore((s) => s.current)
  const playbackState = usePlayerStore((s) => s.playbackState)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const buffered = usePlayerStore((s) => s.buffered)
  const volume = usePlayerStore((s) => s.volume)
  const muted = usePlayerStore((s) => s.muted)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat)
  const queueOpen = usePlayerStore((s) => s.queueOpen)
  const toggleQueue = usePlayerStore((s) => s.toggleQueue)
  const toggleHelp = usePlayerStore((s) => s.toggleHelp)
  const queue = usePlayerStore((s) => s.queue)
  const index = usePlayerStore((s) => s.index)
  const liked = usePlayerStore((s) => s.liked)
  const toggleLike = usePlayerStore((s) => s.toggleLike)

  const upcoming = Math.max(0, queue.length - index - 1)
  const effectiveDuration = duration > 0 ? duration : (current?.duration ?? 0)
  const pct = effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0
  const bufferPct =
    effectiveDuration > 0 ? Math.min(100, (buffered / effectiveDuration) * 100) : 0
  const isLiked = current ? liked.some((t) => t.id === current.id) : false
  const isLoading = playbackState === PLAYBACK.LOADING
  const isPlaying = playbackState === PLAYBACK.PLAYING
  const isError = playbackState === PLAYBACK.ERROR

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat

  return (
    <footer
      aria-label="Reproductor"
      className="relative flex flex-col gap-2 border-t border-white/5 bg-[#121e20] px-3 py-2 sm:grid sm:h-[76px] sm:grid-cols-[minmax(160px,1fr)_minmax(0,2fr)_minmax(140px,1fr)] sm:items-center sm:gap-4 sm:px-4 sm:py-0"
    >
      {/* Acento turquesa ultra sutil en el borde superior */}
      <div aria-hidden className="accent-hairline pointer-events-none absolute inset-x-0 top-0 h-px" />
      {/* ---- Izquierda: pista actual ---- */}
      <div className="flex min-w-0 items-center gap-3">
        {current ? (
          <>
            <Thumb
              src={current.thumbnail}
              alt={`Carátula de ${current.title}`}
              className="h-14 w-14 shrink-0 rounded-md border border-white/5"
              iconSize={22}
            />
            <div className="min-w-0">
              <p
                className="truncate text-[13.5px] font-bold leading-tight text-white"
                title={current.title}
              >
                {current.title}
              </p>
              <p className="mt-0.5 truncate text-[11px] leading-tight text-[#8ca0af]" title={current.artist}>
                {current.artist}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleLike(current)}
              aria-pressed={isLiked}
              aria-label={isLiked ? 'Quitar de Me gusta' : 'Añadir a Me gusta'}
              className="ml-1 shrink-0 rounded-full p-1.5 transition hover:scale-110"
            >
              <Heart
                size={17}
                fill={isLiked ? '#15d3a2' : 'transparent'}
                className={isLiked ? 'text-[#15d3a2]' : 'text-[#8ca0af] hover:text-white'}
              />
            </button>
          </>
        ) : (
          <>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-white/[0.06]">
              <AudioLines size={22} className="text-[#4a5560]" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#5f7280]">Nada suena</p>
              <p className="text-[11px] text-[#4a5560]">Elige una canción para empezar</p>
            </div>
          </>
        )}
      </div>

      {/* ---- Centro: controles + seekbar ---- */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            aria-label="Aleatorio"
            title="Aleatorio"
            className={`relative transition hover:scale-110 hidden sm:inline-flex ${shuffle ? 'text-[#15d3a2]' : 'text-[#8ca0af] hover:text-white'}`}
          >
            <Shuffle size={17} strokeWidth={2.2} />
            {shuffle && <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#15d3a2]" />}
          </button>

          <button
            type="button"
            onClick={previous}
            disabled={!current}
            aria-label="Anterior"
            title="Anterior"
            className="text-[#8ca0af] transition hover:scale-110 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            disabled={!current}
            aria-label={
              isLoading ? 'Cargando…' : isPlaying ? 'Pausar' : isError ? 'Reintentar reproducción' : 'Reproducir'
            }
            title={isError ? 'Reintentar reproducción' : undefined}
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-black transition hover:scale-105 hover:bg-[#f0f0f0] disabled:pointer-events-none disabled:opacity-30 sm:h-10 sm:w-10"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" aria-hidden />
            ) : isError ? (
              <RotateCw size={18} strokeWidth={2.5} aria-hidden />
            ) : isPlaying ? (
              <Pause size={19} fill="currentColor" aria-hidden />
            ) : (
              <Play size={19} fill="currentColor" className="ml-0.5" aria-hidden />
            )}
          </button>

          <button
            type="button"
            onClick={() => next(false)}
            disabled={!current}
            aria-label="Siguiente"
            title="Siguiente"
            className="text-[#8ca0af] transition hover:scale-110 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            type="button"
            onClick={cycleRepeat}
            aria-pressed={repeat !== 'off'}
            aria-label={repeat === 'one' ? 'Repetir una' : repeat === 'all' ? 'Repetir todo' : 'Repetir desactivado'}
            title={repeat === 'one' ? 'Repetir una' : repeat === 'all' ? 'Repetir todo' : 'Repetir'}
            className={`relative transition hover:scale-110 hidden sm:inline-flex ${repeat !== 'off' ? 'text-[#15d3a2]' : 'text-[#8ca0af] hover:text-white'}`}
          >
            <RepeatIcon size={17} strokeWidth={2.2} />
            {repeat !== 'off' && <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#15d3a2]" />}
          </button>
        </div>

        {/* Seekbar con tiempos */}
        <div className="flex w-full max-w-[560px] items-center gap-2 text-[11px] tabular-nums text-[#8ca0af]">
          <span className="w-9 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(effectiveDuration))}
            step={1}
            value={Math.min(currentTime, effectiveDuration || currentTime)}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="Buscar en la canción"
            aria-valuetext={`${formatTime(currentTime)} de ${formatTime(effectiveDuration)}`}
            className="oct-range flex-1"
            style={{ '--fill': `${pct}%`, '--buffer': `${Math.max(pct, bufferPct)}%` }}
            disabled={!current}
          />
          <span className="w-9">{effectiveDuration > 0 ? formatTime(effectiveDuration) : '–:––'}</span>
        </div>
      </div>

      {/* ---- Derecha: cola + volumen ---- */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={toggleQueue}
          aria-pressed={queueOpen}
          aria-label="Cola de reproducción"
          title="Cola de reproducción"
          className={`relative rounded-md p-2 transition ${
            queueOpen ? 'text-[#15d3a2]' : 'text-[#8ca0af] hover:text-white'
          }`}
        >
          <ListMusic size={20} />
          {upcoming > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#15d3a2] px-1 text-[9px] font-black text-black">
              {upcoming > 99 ? '99' : upcoming}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
            title={muted ? 'Activar sonido' : 'Silenciar'}
            className="text-[#8ca0af] transition hover:scale-110 hover:text-white"
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
            className="oct-range w-24 hidden sm:block"
            style={{ '--fill': `${muted ? 0 : Math.round(volume * 100)}%` }}
          />
        </div>

        <button
          type="button"
          onClick={toggleHelp}
          aria-label="Ver atajos de teclado"
          title="Atajos de teclado (?)"
          className="rounded-md p-2 text-[#8ca0af] transition hover:bg-white/5 hover:text-white"
        >
          <Keyboard size={19} />
        </button>
      </div>
    </footer>
  )
}

