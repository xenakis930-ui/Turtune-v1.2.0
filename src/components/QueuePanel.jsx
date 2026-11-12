import { ListMusic, X, Trash2, Play, Pause, Loader2 } from '../lib/icons'
import Thumb from './Thumb'
import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'
import { playQueueIndex, togglePlay } from '../audio/engine'
import { formatDuration } from '../lib/format'

/** Panel lateral deslizante: "Suena ahora" + "A continuación" (con eliminar/limpiar). */
export default function QueuePanel() {
  const open = usePlayerStore((s) => s.queueOpen)
  const toggleQueue = usePlayerStore((s) => s.toggleQueue)
  const queue = usePlayerStore((s) => s.queue)
  const index = usePlayerStore((s) => s.index)
  const playbackState = usePlayerStore((s) => s.playbackState)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const clearUpNext = usePlayerStore((s) => s.clearUpNext)

  const current = index >= 0 ? queue[index] : null
  const upcoming = queue.map((track, i) => ({ track, i })).slice(index + 1)

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar cola"
          onClick={toggleQueue}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[1px] sm:hidden"
          style={{ touchAction: 'manipulation' }}
        />
      )}
      <aside
        aria-label="Cola de reproducción"
        aria-hidden={!open}
        className={`fixed inset-0 z-40 flex w-full flex-col border-white/5 bg-[#141f22] shadow-2xl transition-transform duration-300 ease-out sm:bottom-[76px] sm:top-0 sm:w-[340px] sm:max-w-[92vw] sm:border-l ${
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2">
            <ListMusic size={19} className="text-[#15d3a2]" aria-hidden />
            <h2 className="text-[16px] font-extrabold tracking-tight text-white">Cola</h2>
            {upcoming.length > 0 && (
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#8ca0af]">
                {upcoming.length} en espera
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={clearUpNext}
              disabled={upcoming.length === 0}
              aria-label="Vaciar lo que sigue en la cola"
              title="Vaciar la cola"
              className="rounded-md p-2 text-[#8ca0af] transition hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-30"
            >
              <Trash2 size={17} />
            </button>
            <button
              type="button"
              onClick={toggleQueue}
              onTouchEnd={(e) => { e.preventDefault(); toggleQueue() }}
              aria-label="Cerrar cola"
              title="Cerrar"
              className="rounded-lg p-2.5 text-[#8ca0af] transition hover:bg-white/5 hover:text-white active:scale-95"
              style={{ touchAction: 'manipulation', cursor: 'pointer' }}
            >
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="scroll-area flex-1 overflow-y-auto px-3 py-3">
          {!current ? (
            <p className="mt-10 px-4 text-center text-sm leading-relaxed text-[#72868f]">
              La cola está vacía.<br />
              Reproduce algo desde la búsqueda y aparecerá aquí.
            </p>
          ) : (
            <>
              {/* Suena ahora */}
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#15d3a2]">
                Suena ahora
              </p>
              <button
                type="button"
                onClick={togglePlay}
                className="mt-1.5 flex w-full items-center gap-3 rounded-lg bg-white/[0.06] p-2 text-left transition hover:bg-white/[0.09]"
                aria-label={playbackState === PLAYBACK.PLAYING ? 'Pausar' : 'Reproducir'}
              >
                <Thumb src={current.thumbnail} alt="" className="h-14 w-14 rounded-md" iconSize={22} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-white" title={current.title}>
                    {current.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-[#8ca0af]">{current.artist}</span>
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#15d3a2] text-[#062a1d]">
                  {playbackState === PLAYBACK.LOADING ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : playbackState === PLAYBACK.PLAYING ? (
                    <Pause size={16} fill="currentColor" />
                  ) : (
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                  )}
                </span>
              </button>

              {/* A continuación */}
              <p className="mt-5 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8ca0af]">
                A continuación
              </p>
              {upcoming.length === 0 ? (
                <p className="mt-3 px-2 text-[13px] text-[#72868f]">
                  No hay más pistas en la cola. Añade canciones con el icono{' '}
                  <span className="font-semibold text-[#8ca0af]">+ cola</span> en los resultados.
                </p>
              ) : (
                <ol className="mt-1.5">
                  {upcoming.map(({ track, i }) => (
                    <li key={`${track.id}-${i}`} className="group relative">
                      <button
                        type="button"
                        onClick={() => playQueueIndex(i)}
                        className="flex w-full items-center gap-3 rounded-md p-2 pr-9 text-left transition hover:bg-white/[0.06]"
                        aria-label={`Reproducir ${track.title}`}
                      >
                        <Thumb src={track.thumbnail} alt="" className="h-11 w-11 rounded-md" iconSize={18} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-white" title={track.title}>
                            {track.title}
                          </span>
                          <span className="block truncate text-[11px] text-[#8ca0af]">{track.artist}</span>
                        </span>
                        <span className="text-[11px] tabular-nums text-[#72868f]">
                          {formatDuration(track.duration)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromQueue(i)}
                        aria-label={`Quitar ${track.title} de la cola`}
                        title="Quitar de la cola"
                        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#8ca0af] opacity-0 transition hover:bg-white/10 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>

        {/* Cerrar en móvil */}
        <button
          type="button"
          onClick={toggleQueue}
          className="mx-5 mb-3 mt-1 flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 text-[12px] font-bold text-[#8ca0af] transition hover:border-[#15d3a2]/40 hover:text-[#15d3a2] sm:hidden"
          style={{ touchAction: 'manipulation' }}
        >
          <X size={16} /> Cerrar cola
        </button>

        {/* Pie */}
        <div className="border-t border-white/5 px-5 py-3 text-[10.5px] leading-snug text-[#5f7280]">
          La cola es local a esta sesión. Al llegar al final con «repetir» desactivado, la
          reproducción se detiene.
        </div>
      </aside>
    </>
  )
}
