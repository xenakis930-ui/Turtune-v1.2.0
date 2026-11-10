import { useEffect, useRef, useState } from 'react'
import {
  Import, X, Loader2, AlertCircle, ListPlus, Heart, Play, ListMusic, CheckCircle2,
} from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { importPlaylist } from '../lib/api'
import { playTrack } from '../audio/engine'
import Thumb from './Thumb'
import { formatDuration } from '../lib/format'

/**
 * Modal "Importar playlist de YouTube":
 *   URL → (loading) → previsualización → cola / me gusta / reproducir ahora.
 */
export default function ImportPlaylistModal() {
  const open = usePlayerStore((s) => s.importOpen)
  const closeImport = usePlayerStore((s) => s.closeImport)
  const appendToQueue = usePlayerStore((s) => s.appendToQueue)
  const likeMany = usePlayerStore((s) => s.likeMany)
  const savePlaylist = usePlayerStore((s) => s.savePlaylist)
  const pushToast = usePlayerStore((s) => s.pushToast)

  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('form') // form | loading | preview
  const [error, setError] = useState('')
  const [data, setData] = useState(null) // { title, items }
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setStatus('form')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  if (!open) return null

  const doImport = async () => {
    const target = url.trim()
    if (!target) {
      setError('Pega una URL de playlist de YouTube.')
      return
    }
    setStatus('loading')
    setError('')
    try {
      const res = await importPlaylist(target)
      if (!res?.ok) {
        setError(res?.error ?? 'No se pudo leer la playlist.')
        setStatus('form')
        return
      }
      setData({ title: res.title, items: res.items })
      // Autoguardar en tu colección local (se verá para siempre en Tu biblioteca)
      try {
        const listId = new URL(target).searchParams.get('list') ?? `yt-${Date.now()}`
        savePlaylist({
          id: listId,
          title: res.title,
          itemCount: res.items.length,
          thumbnail: res.items[0]?.thumbnail ?? '',
        })
      } catch {
        /* URL peculiar pero importación correcta: no pasa nada */
      }
      setStatus('preview')
    } catch (err) {
      setError(String(err?.message ?? err))
      setStatus('form')
    }
  }

  const finish = (message) => {
    pushToast('info', message)
    closeImport()
  }

  const addToQueue = () => {
    appendToQueue(data.items)
    finish(`${data.items.length} pistas añadidas a la cola`)
  }
  const saveToLikes = () => {
    likeMany(data.items)
    finish(`${data.items.length} pistas añadidas a Me gusta`)
  }
  const playNow = () => {
    const [first, ...rest] = data.items
    playTrack(first, data.items)
    finish(`Reproduciendo «${data.title}»`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Importar playlist de YouTube"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={closeImport}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[2px]"
      />

      <div className="relative flex max-h-[100vh] w-full max-w-lg flex-col overflow-hidden rounded-none border border-white/10 bg-[#141f22] shadow-2xl sm:max-h-[85vh] sm:rounded-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#15d3a2]/15">
              <Import size={19} className="text-[#15d3a2]" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white">
                Importar playlist de YouTube
              </h2>
              <p className="text-[11px] text-[#8ca0af]">Solo metadatos · la música suena como siempre</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeImport}
            aria-label="Cerrar"
            className="rounded-md p-2 text-[#8ca0af] transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {status !== 'preview' ? (
            <>
              <label htmlFor="playlist-url" className="text-[12px] font-bold uppercase tracking-wider text-[#8ca0af]">
                URL de la playlist
              </label>
              <input
                id="playlist-url"
                ref={inputRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && status !== 'loading' && doImport()}
                placeholder="https://www.youtube.com/playlist?list=PL…"
                spellCheck={false}
                autoComplete="off"
                disabled={status === 'loading'}
                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#101a1b] px-4 text-[13.5px] text-white placeholder-[#5a6b7a] outline-none transition focus:border-[#15d3a2]/50"
              />
              <p className="mt-2 text-[11px] leading-snug text-[#5f7280]">
                Funciona con playlists <strong className="text-[#8ca0af]">públicas y privadas</strong> (con la sesión
                del navegador detectada en Ajustes). Se guardará en <strong className="text-[#8ca0af]">Mis playlists</strong>.
                Máx. 100 pistas.
              </p>

              {error && (
                <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-[#2a1215] px-3 py-2 text-[12px] leading-snug text-[#fecaca]">
                  <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#f87171]" /> {error}
                </p>
              )}

              <button
                type="button"
                onClick={doImport}
                disabled={status === 'loading'}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#15d3a2] text-[13px] font-extrabold uppercase tracking-wider text-[#06262b] transition hover:bg-[#4fe3b7] disabled:cursor-wait disabled:opacity-70"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={17} className="animate-spin" /> Leyendo playlist…
                  </>
                ) : (
                  <>
                    <Import size={17} strokeWidth={2.5} /> Importar
                  </>
                )}
              </button>
              {status === 'loading' && (
                <p className="mt-2 text-center text-[11px] text-[#72868f]">
                  yt-dlp está listando el índice · puede tardar 10–20 s
                </p>
              )}
            </>
          ) : (
            <>
              {/* Previsualización */}
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#15d3a2]">
                <CheckCircle2 size={15} /> Playlist leída
              </div>
              <h3 className="mt-1.5 line-clamp-2 text-xl font-black leading-snug text-white" title={data.title}>
                {data.title}
              </h3>
              <p className="mt-0.5 flex items-center gap-2 text-[12px] font-semibold text-[#8ca0af]">
                <ListMusic size={14} /> {data.items.length} pistas
              </p>

              <ol className="scroll-area mt-3 max-h-56 divide-y divide-white/5 overflow-y-auto rounded-xl bg-white/[0.03]">
                {data.items.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="w-5 text-center text-[11px] tabular-nums text-[#72868f]">{i + 1}</span>
                    <Thumb src={t.thumbnail} alt="" className="h-9 w-9 rounded" iconSize={16} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-white" title={t.title}>
                        {t.title}
                      </span>
                      <span className="block truncate text-[10.5px] text-[#8ca0af]">{t.artist}</span>
                    </span>
                    <span className="text-[10.5px] tabular-nums text-[#72868f]">
                      {formatDuration(t.duration)}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={playNow}
                  className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#15d3a2] text-[12.5px] font-extrabold uppercase tracking-wider text-[#06262b] transition hover:bg-[#4fe3b7]"
                >
                  <Play size={16} fill="currentColor" /> Reproducir ahora
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={addToQueue}
                    className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 text-[12px] font-bold text-white transition hover:border-[#15d3a2]/60 hover:text-[#15d3a2]"
                  >
                    <ListPlus size={16} /> Añadir a la cola
                  </button>
                  <button
                    type="button"
                    onClick={saveToLikes}
                    className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 text-[12px] font-bold text-white transition hover:border-[#15d3a2]/60 hover:text-[#15d3a2]"
                  >
                    <Heart size={16} /> A Me gusta
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
