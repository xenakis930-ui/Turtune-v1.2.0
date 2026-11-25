import { useState } from 'react'
import { X, Plus } from '../lib/icons'
import { usePlayerStore } from '../store/usePlayerStore'

export default function CreatePlaylistModal() {
  const open = usePlayerStore((s) => s.createPlaylistOpen)
  const close = usePlayerStore((s) => s.closeCreatePlaylist)
  const createPlaylist = usePlayerStore((s) => s.createPlaylist)
  const pushToast = usePlayerStore((s) => s.pushToast)
  const [title, setTitle] = useState('')

  if (!open) return null

  const handleCreate = () => {
    if (!title.trim()) return
    createPlaylist(title.trim())
    close()
    pushToast('success', 'Playlist creada: ' + title.trim())
    setTitle('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={close}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141f22] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">Crear playlist</h3>
          <button type="button" onClick={close} className="rounded-full p-1 text-[#8ca0af] hover:text-white" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <p className="text-[12px] text-[#8ca0af]">Dale un nombre a tu nueva playlist</p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mi playlist"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim()) handleCreate()
          }}
          className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-[#101a1b] px-4 text-[13px] text-white placeholder-[#5a6b7a] outline-none transition focus:border-[#15d3a2]/50"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded-full px-4 py-2 text-[12px] font-bold text-[#8ca0af] transition hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!title.trim()}
            className="rounded-full bg-[#15d3a2] px-5 py-2 text-[12px] font-extrabold uppercase tracking-wider text-[#06262b] transition hover:bg-[#4fe3b7] disabled:opacity-50"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  )
}
