import { Home, Search, Library, Heart, ListMusic, Import, Settings } from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'
import { getAppVersion } from '../lib/api'
import { useEffect, useState } from 'react'
import turtuneLogo from '../assets/turtune.png'

const NAV = [
  { id: 'home', label: 'Inicio', Icon: Home },
  { id: 'search', label: 'Buscar', Icon: Search },
  { id: 'library', label: 'Tu biblioteca', Icon: Library },
  { id: 'settings', label: 'Ajustes', Icon: Settings },
]

/** Barra lateral fija: logo, navegación, atajo a Me gusta y tarjeta de sesión. */
export default function Sidebar() {
  const view = usePlayerStore((s) => s.view)
  const setView = usePlayerStore((s) => s.setView)
  const likedCount = usePlayerStore((s) => s.liked.length)
  const queueOpen = usePlayerStore((s) => s.queueOpen)
  const toggleQueue = usePlayerStore((s) => s.toggleQueue)
  const openImport = usePlayerStore((s) => s.openImport)
  const [version, setVersion] = useState('')

  useEffect(() => {
    getAppVersion().then(setVersion).catch(() => {})
  }, [])

  return (
    <aside className="flex w-[236px] shrink-0 flex-col gap-2 rounded-xl border border-white/[0.06] bg-[#0c1718] p-4">
      {/* Logo */}
      <div className="mb-2 flex items-center gap-2.5 px-1">
        <img
          src={turtuneLogo}
          alt="Turtune — logotipo de la aplicación (tortuga con auriculares)"
          className="h-11 w-11 object-contain drop-shadow-[0_0_14px_rgba(21,211,162,0.35)]"
          draggable={false}
        />
        <span className="leading-tight">
          <span className="block text-[21px] font-black tracking-tight text-white">Turtune</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#15d3a2]">
            audio-only
          </span>
        </span>
      </div>

      {/* Navegación principal */}
      <nav aria-label="Navegación principal">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ id, label, Icon }) => {
            const active = view === id
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setView(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-bold transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-[#8ca0af] hover:text-white'
                  }`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Atajos de biblioteca */}
      <div className="mt-2 border-t border-white/10 pt-3">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#72868f]">
          Colección
        </p>
        <button
          type="button"
          onClick={() => setView('library')}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-semibold text-[#8ca0af] transition-colors hover:text-white"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-[#15d3a2]/15">
            <Heart size={15} fill="#15d3a2" className="text-[#15d3a2]" aria-hidden />
          </span>
          <span className="flex-1 text-left">Me gusta</span>
          <span className="text-xs tabular-nums text-[#72868f]">{likedCount}</span>
        </button>
        <button
          type="button"
          onClick={toggleQueue}
          aria-pressed={queueOpen}
          className={`mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-semibold transition-colors ${
            queueOpen ? 'bg-white/10 text-[#15d3a2]' : 'text-[#8ca0af] hover:text-white'
          }`}
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.08]">
            <ListMusic size={16} aria-hidden />
          </span>
          <span className="flex-1 text-left">Cola de reproducción</span>
        </button>
        <button
          type="button"
          onClick={openImport}
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-semibold text-[#8ca0af] transition-colors hover:text-white"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-[#15d3a2]/10">
            <Import size={16} className="text-[#15d3a2]" aria-hidden />
          </span>
          <span className="flex-1 text-left">Importar playlist</span>
        </button>
      </div>

      <div className="mt-auto rounded-lg border border-white/[0.05] bg-white/[0.03] p-3 text-[11px] leading-snug text-[#72868f]">
        <p className="font-semibold text-[#8ca0af]">Motor de audio</p>
        <p className="mt-1">yt-dlp · solo audio (m4a/opus) · sin vídeo</p>
        {version && <p className="mt-1 tabular-nums text-[#5f7280]">Turtune v{version}</p>}
      </div>

      {/* Firma del autor */}
      <p className="-mt-1 px-3 pb-1 text-center text-[9px] font-bold uppercase tracking-[0.42em] text-[#54646a] select-none">
        by <span className="text-[#15d3a2]/60">Xenakis165</span>
      </p>
    </aside>
  )
}
