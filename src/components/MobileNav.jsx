import { Home, Search, Library, Settings, Music2 } from '../lib/icons'
import { usePlayerStore } from '../store/usePlayerStore'

const ITEMS = [
  { id: 'home', label: 'Inicio', Icon: Home },
  { id: 'search', label: 'Buscar', Icon: Search },
  { id: 'library', label: 'Biblioteca', Icon: Library },
  { id: 'settings', label: 'Ajustes', Icon: Settings },
]

/** Barra de navegación inferior para móvil/tablet (visible < lg). */
export default function MobileNav() {
  const view = usePlayerStore((s) => s.view)
  const setView = usePlayerStore((s) => s.setView)
  const queueOpen = usePlayerStore((s) => s.queueOpen)
  const toggleQueue = usePlayerStore((s) => s.toggleQueue)
  const likedCount = usePlayerStore((s) => s.liked.length)

  return (
    <nav
      aria-label="Navegación principal"
      className="lg:hidden flex shrink-0 items-center justify-around border-t border-white/5 bg-[#0c1718] px-2 pb-[env(safe-area-inset-bottom)] pt-1.5"
    >
      {ITEMS.map(({ id, label, Icon }) => {
        const active = view === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              active ? 'text-[#15d3a2]' : 'text-[#8ca0af]'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden />
            <span className="truncate">{label}</span>
          </button>
        )
      })}
      <button
        type="button"
        onClick={toggleQueue}
        aria-pressed={queueOpen}
        aria-label="Cola de reproducción"
        className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
          queueOpen ? 'text-[#15d3a2]' : 'text-[#8ca0af]'
        }`}
      >
        <Music2 size={22} strokeWidth={queueOpen ? 2.5 : 2} aria-hidden />
        <span className="truncate">Cola</span>
        {likedCount > 0 && (
          <span className="absolute right-3 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#15d3a2] px-1 text-[9px] font-black text-[#062a1d]">
            {likedCount > 9 ? '9+' : likedCount}
          </span>
        )}
      </button>
    </nav>
  )
}
