import { useMemo } from 'react'
import { Play, Pause, History, ArrowRight, AudioLines, Music2 } from '../lib/icons'
import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'
import TrackCard from './TrackCard'
import Thumb from './Thumb'
import { playTrack, togglePlay } from '../audio/engine'

const QUICK_TILES = [
  { label: 'Pop', query: 'top 40 pop hits' },
  { label: 'Reggaetón', query: 'reggaeton hits' },
  { label: 'Hip-hop', query: 'hip hop hits' },
  { label: 'Trap latino', query: 'trap latino' },
  { label: 'Electrónica', query: 'dance pop hits' },
  { label: 'Rock', query: 'rock en español hits' },
  { label: 'Baladas', query: 'baladas románticas' },
  { label: 'Corridos tumbados', query: 'corridos tumbados' },
]

function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Vista principal: accesos rápidos + historial reciente. */
export default function HomeView() {
  const history = usePlayerStore((s) => s.history)
  const setQuery = usePlayerStore((s) => s.setQuery)
  const setView = usePlayerStore((s) => s.setView)
  const openImport = usePlayerStore((s) => s.openImport)
  const current = usePlayerStore((s) => s.current)
  const playbackState = usePlayerStore((s) => s.playbackState)

  const recent = useMemo(() => history.slice(0, 12), [history])
  const recentRow = useMemo(() => recent.slice(0, 6), [recent])

  return (
    <div className="scroll-area h-full overflow-y-auto px-6 pb-8 pt-5">
      {/* Saludo */}
      <h1 className="text-[28px] font-black tracking-tight text-white">
        {greeting()}
        <span className="text-[#15d3a2]">.</span>
      </h1>

      {/* Accesos rápidos */}
      <section aria-label="Accesos rápidos" className="mt-4">
        <div className="scroll-area -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {QUICK_TILES.map((tile) => (
            <button
              key={tile.label}
              type="button"
              onClick={() => setQuery(tile.query)}
              className="group relative h-14 min-w-[168px] shrink-0 overflow-hidden rounded-lg border border-white/5 bg-[#141f22] text-left transition-colors hover:border-[#15d3a2]/40 hover:bg-[#18261f] focus-visible:border-[#15d3a2]/50"
            >
            <span className="absolute left-4 top-1/2 max-w-[68%] -translate-y-1/2 text-[13.5px] font-bold leading-tight text-white">
              {tile.label}
            </span>
            <span
              aria-hidden
              className="absolute -right-2 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center rounded-lg text-[#15d3a2]/60 transition-colors duration-300 group-hover:text-[#15d3a2]"
            >
              <Music2 size={26} />
            </span>
            </button>
          ))}
        </div>
      </section>

      {/* Escuchadas recientemente */}
      <section aria-label="Escuchadas recientemente" className="mt-9">
        <div className="mb-3 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-[#15d3a2]" aria-hidden />
            <h2 className="text-[21px] font-extrabold tracking-tight text-white">
              Escuchadas recientemente
            </h2>
          </div>
          {recent.length > 6 && (
            <span className="text-xs font-bold uppercase tracking-wider text-[#72868f]">
              {recent.length} pistas
            </span>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="border-t border-white/[0.06] pt-6">
            <div className="grid items-center gap-10 md:grid-cols-12">
              {/* Columna editorial */}
              <div className="md:col-span-7">
                <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#15d3a2]">
                  <span aria-hidden className="inline-block h-px w-8 bg-[#15d3a2]/60" />
                  Turtune · Audio-only
                </p>
                <h3 className="mt-3 text-[27px] font-black leading-[1.05] tracking-tight text-white sm:text-[33px]">
                  La música,
                  <br />
                  sin lastre<span className="text-[#15d3a2]">.</span>
                </h3>
                <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-[#8ca0af]">
                  Busca en el índice de YouTube y suena al instante — solo audio,
                  sin descargar ni un byte de vídeo. Una búsqueda y listo.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <button
                    type="button"
                    onClick={() => setView('search')}
                    className="rounded-full bg-gradient-to-r from-[#15d3a2] to-[#5ae688] px-7 py-3 text-[13px] font-extrabold uppercase tracking-wider text-[#062a1d] transition-all hover:from-[#4fe3b7] hover:to-[#7ff0a8]"
                  >
                    Explorar música
                  </button>
                  <button
                    type="button"
                    onClick={openImport}
                    className="group flex items-center gap-2 text-[13px] font-bold text-[#8ca0af] transition-colors hover:text-white"
                  >
                    o importa una playlist de YouTube
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </button>
                </div>
                <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-[#5f7280]">
                  Bestaudio · AAC / Opus · 128–160 kbps
                </p>
              </div>

              {/* Marca grande, contenida */}
              <div aria-hidden className="hidden select-none flex-col items-center gap-5 md:col-span-5 md:flex">
                <div className="grid h-32 w-32 place-items-center rounded-full border border-[#15d3a2]/25">
                  <div className="grid h-24 w-24 place-items-center rounded-full border border-[#15d3a2]/15 bg-[#15d3a2]/5">
                    <AudioLines size={48} strokeWidth={1.25} className="text-[#15d3a2]" />
                  </div>
                </div>
                <p className="text-center text-[10px] font-bold uppercase leading-relaxed tracking-[0.32em] text-[#72868f]">
                  Transmisión
                  <br />
                  en directo
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="scroll-area -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {recentRow.map((track) => {
              const isCurrent = current?.id === track.id
              const isPlaying = isCurrent && playbackState === PLAYBACK.PLAYING
              return (
                <button
                  key={`${track.id}-${track.playedAt}`}
                  type="button"
                  onClick={() => (isCurrent ? togglePlay() : playTrack(track, recent))}
                  className="group relative w-40 shrink-0 overflow-hidden rounded-lg bg-[#141f22] text-left transition-colors hover:bg-[#18262a]"
                  aria-label={`${isPlaying ? 'Pausar' : 'Reproducir'} ${track.title}`}
                >
                  <Thumb
                    src={track.thumbnail}
                    alt=""
                    className="aspect-square w-full"
                    iconSize={36}
                  />
                  <div className="p-2.5">
                    <p
                      className={`truncate text-[12.5px] font-bold leading-snug ${
                        isCurrent ? 'text-[#15d3a2]' : 'text-white'
                      }`}
                      title={track.title}
                    >
                      {track.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#8ca0af]" title={track.artist}>
                      {track.artist}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="absolute bottom-[64px] right-2 grid h-10 w-10 place-items-center rounded-full bg-[#15d3a2] text-black opacity-0 shadow-card transition-all duration-200 group-hover:opacity-100"
                  >
                    {isPlaying ? (
                      <Pause size={17} fill="currentColor" />
                    ) : (
                      <Play size={17} fill="currentColor" className="ml-0.5" />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Feed de tarjetas (historial en grid) */}
      {recent.length > 6 && (
        <section aria-label="Historial completo" className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {recent.slice(6).map((track) => (
            <TrackCard key={track.id} track={track} context={recent} />
          ))}
        </section>
      )}
    </div>
  )
}
