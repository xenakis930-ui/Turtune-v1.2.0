import { useEffect, useState } from 'react'
import { Heart, Play, Pause, Clock3, Library, Youtube, Loader2, ListPlus, RefreshCw, X } from 'lucide-react'
import { usePlayerStore, PLAYBACK } from '../store/usePlayerStore'
import { playTrack, togglePlay } from '../audio/engine'
import Thumb from './Thumb'
import { formatDuration } from '../lib/format'
import { account, importPlaylist } from '../lib/api'

/** "Tu biblioteca": playlists de tu cuenta de YouTube + Me gusta. */
export default function LibraryView() {
  const liked = usePlayerStore((s) => s.liked)
  const current = usePlayerStore((s) => s.current)
  const playbackState = usePlayerStore((s) => s.playbackState)
  const setView = usePlayerStore((s) => s.setView)

  const contextIds = new Set(liked.map((t) => t.id))
  const isContextPlaying = current && contextIds.has(current.id) && playbackState === PLAYBACK.PLAYING

  const playAll = () => {
    if (!liked.length) return
    if (current && contextIds.has(current.id)) togglePlay()
    else playTrack(liked[0], liked)
  }

  const totalSeconds = liked.reduce((acc, t) => acc + (Number(t.duration) || 0), 0)

  return (
    <div className="scroll-area h-full overflow-y-auto">
      <YtPlaylistsSection />

      {/* Cabecera */}
      <div className="flex flex-wrap items-end gap-6 px-6 pb-6 pt-8">
        <div className="grid h-44 w-44 place-items-center rounded-xl border border-[#15d3a2]/25 bg-[#17231f] shadow-card">
          <Heart size={64} strokeWidth={1.5} className="text-[#15d3a2]" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Playlist</p>
          <h1 className="mt-1 text-5xl font-black tracking-tight text-white">Me gusta</h1>
          <p className="mt-3 text-sm font-semibold text-white/85">
            Turtune User · <span className="tabular-nums">{liked.length}</span> canciones
            {totalSeconds > 0 && (
              <>
                {' · '}
                <span className="tabular-nums">{Math.round(totalSeconds / 60)} min</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="bg-black/40 px-6 pb-8 pt-5">
        {liked.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <Library size={40} className="text-[#2e3a46]" strokeWidth={1.5} aria-hidden />
            <div>
              <p className="text-lg font-bold text-white">Aún no tienes favoritos</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-[#8ca0af]">
                Toca el corazón en cualquier canción y aparecerá aquí, disponible sin conexión a
                otras pestañas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView('search')}
              className="rounded-full bg-[#15d3a2] px-6 py-2.5 text-sm font-extrabold uppercase tracking-wide text-black transition hover:scale-105 hover:bg-[#4fe3b7]"
            >
              Buscar música
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-5">
              <button
                type="button"
                onClick={playAll}
                aria-label={isContextPlaying ? 'Pausar' : 'Reproducir todo'}
                className="grid h-14 w-14 place-items-center rounded-full bg-[#15d3a2] text-black shadow-card transition hover:scale-105 hover:bg-[#4fe3b7]"
              >
                {isContextPlaying ? (
                  <Pause size={26} fill="currentColor" />
                ) : (
                  <Play size={26} fill="currentColor" className="ml-0.5" />
                )}
              </button>
            </div>

            <ol className="divide-y divide-white/5">
              {liked.map((track, i) => {
                const isCurrent = current?.id === track.id
                const isPlaying = isCurrent && playbackState === PLAYBACK.PLAYING
                return (
                  <li key={track.id} className="group">
                    <button
                      type="button"
                      onClick={() => (isCurrent ? togglePlay() : playTrack(track, liked))}
                      className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-4 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.06]"
                      aria-label={`${isPlaying ? 'Pausar' : 'Reproducir'} ${track.title}`}
                    >
                      <span className="text-center text-sm tabular-nums text-[#72868f]">
                        {isCurrent ? (
                          <span className="font-bold text-[#15d3a2]">
                            {isPlaying ? '♪' : '‖'}
                          </span>
                        ) : (
                          <>
                            <span className="group-hover:hidden">{i + 1}</span>
                            <Play size={14} fill="currentColor" className="hidden group-hover:inline" />
                          </>
                        )}
                      </span>
                      <span className="flex min-w-0 items-center gap-3">
                        <Thumb src={track.thumbnail} alt="" className="h-11 w-11 rounded-md" iconSize={18} />
                        <span className="min-w-0">
                          <span
                            className={`block truncate text-[14px] font-semibold ${
                              isCurrent ? 'text-[#15d3a2]' : 'text-white'
                            }`}
                            title={track.title}
                          >
                            {track.title}
                          </span>
                          <span className="block truncate text-[12px] text-[#8ca0af]">{track.artist}</span>
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[12px] tabular-nums text-[#8ca0af]">
                        <Clock3 size={13} aria-hidden /> {formatDuration(track.duration)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </div>
    </div>
  )
}


/* ---------- Mis playlists (colecci�n local � sincronizable) ---------- */

function YtPlaylistsSection() {
  const myPlaylists = usePlayerStore((s) => s.myPlaylists)
  const removePlaylist = usePlayerStore((s) => s.removePlaylist)
  const savePlaylist = usePlayerStore((s) => s.savePlaylist)
  const openImport = usePlayerStore((s) => s.openImport)
  const appendToQueue = usePlayerStore((s) => s.appendToQueue)
  const likeMany = usePlayerStore((s) => s.likeMany)
  const pushToast = usePlayerStore((s) => s.pushToast)

  const [connected, setConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState('') // `${id}:queue|likes|play`

  useEffect(() => {
    account.status().then((st) => setConnected(!!st?.connected)).catch(() => {})
  }, [])

  const syncFromAccount = async () => {
    setSyncing(true)
    const res = await account.playlists()
    setSyncing(false)
    if (!res?.ok) {
      pushToast('error', res?.error ?? 'No se pudieron leer tus playlists.')
      return
    }
    for (const p of res.items) {
      savePlaylist({ id: p.id, title: p.title, itemCount: p.itemCount, thumbnail: p.thumbnail })
    }
    pushToast('info', `${res.items.length} playlists sincronizadas${res.channel?.title ? ` de �${res.channel.title}�` : ''}`)
  }

  const importTracks = async (p, mode) => {
    const key = `${p.id}:${mode}`
    setImporting(key)
    const res = await importPlaylist(`https://www.youtube.com/playlist?list=${p.id}`)
    setImporting('')
    if (!res?.ok || !res.items?.length) {
      pushToast('error', res?.error ?? 'No se pudo leer la playlist (�URL privada sin sesi�n del navegador?).')
      return
    }
    const tracks = res.items
    if (mode === 'queue') {
      appendToQueue(tracks)
      pushToast('info', `${tracks.length} pistas en la cola desde �${p.title}�`)
    } else if (mode === 'likes') {
      likeMany(tracks)
      pushToast('info', `${tracks.length} pistas guardadas en Me gusta`)
    } else {
      playTrack(tracks[0], tracks)
      pushToast('info', `Reproduciendo �${p.title}�`)
    }
  }

  return (
    <section aria-label="Mis playlists" className="border-b border-white/5 px-6 pb-6 pt-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#ff0000]/10">
            <Youtube size={20} className="text-[#ff5f5f]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold tracking-tight text-white">Mis playlists</h2>
            <p className="text-[11px] text-[#8ca0af]">
              Guardadas en este equipo � {myPlaylists.length}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {connected && (
            <button
              type="button"
              onClick={syncFromAccount}
              disabled={syncing}
              title="Importar los nombres de todas tus playlists del canal vinculado"
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold text-[#b9d8de] transition hover:border-[#15d3a2]/40 hover:text-[#15d3a2] disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} aria-hidden />
              Sincronizar
            </button>
          )}
          <button
            type="button"
            onClick={openImport}
            className="flex items-center gap-1.5 rounded-full bg-[#15d3a2] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#06262b] transition hover:bg-[#4fe3b7]"
          >
            Importar URL
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      {myPlaylists.length === 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-5">
          <Youtube size={26} className="shrink-0 text-[#4a5560]" aria-hidden />
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#8ca0af]">
            Pega la URL de cualquier playlist (p�blica o privada, con la sesi�n de
            tu navegador detectada) y aparecer� aqu� para siempre.
          </p>
          <button
            type="button"
            onClick={openImport}
            className="shrink-0 rounded-full border border-[#15d3a2]/40 px-4 py-2 text-[11.5px] font-bold text-[#15d3a2] transition hover:border-[#15d3a2] hover:bg-[#15d3a2]/10"
          >
            Importar la primera
          </button>
        </div>
      ) : (
        <div className="scroll-area -mx-1 mt-4 flex gap-4 overflow-x-auto px-1 pb-2">
          {myPlaylists.map((p) => {
            const busyKey = importing.startsWith(`${p.id}:`)
            return (
              <article
                key={p.id}
                className="group relative w-44 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-[#141f22] transition-colors hover:border-white/10"
              >
                <button
                  type="button"
                  onClick={() => importTracks(p, 'play')}
                  aria-label={`Reproducir playlist ${p.title}`}
                  className="relative block aspect-video w-full overflow-hidden"
                >
                  <Thumb src={p.thumbnail} alt="" className="h-full w-full" iconSize={30} />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                    {busyKey ? (
                      <Loader2 size={26} className="animate-spin text-white" />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-[#15d3a2] text-[#06262b]">
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                      </span>
                    )}
                  </span>
                </button>

                {/* Quitar de la colecci�n (no toca YouTube) */}
                <button
                  type="button"
                  onClick={() => {
                    removePlaylist(p.id)
                    pushToast('info', `�${p.title.slice(0, 48)}� eliminada de Mis playlists (YouTube no se toca).`)
                  }}
                  aria-label={`Eliminar ${p.title} de Mis playlists`}
                  title="Eliminar de Mis playlists"
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white/80 opacity-0 backdrop-blur-sm transition hover:bg-black/75 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X size={15} />
                </button>

                <div className="p-2.5">
                  <p className="line-clamp-2 min-h-[2.1em] text-[12px] font-bold leading-snug text-white" title={p.title}>
                    {p.title}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[10.5px] tabular-nums text-[#8ca0af]">{p.itemCount} v�deos</span>
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => importTracks(p, 'queue')}
                        disabled={busyKey}
                        aria-label="A�adir playlist a la cola"
                        title="A�adir a la cola"
                        className="rounded-md p-1.5 text-[#8ca0af] transition hover:bg-white/5 hover:text-[#15d3a2] disabled:opacity-40"
                      >
                        <ListPlus size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => importTracks(p, 'likes')}
                        disabled={busyKey}
                        aria-label="Guardar playlist en Me gusta"
                        title="Guardar en Me gusta"
                        className="rounded-md p-1.5 text-[#8ca0af] transition hover:bg-white/5 hover:text-[#15d3a2] disabled:opacity-40"
                      >
                        <Heart size={15} />
                      </button>
                    </span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
