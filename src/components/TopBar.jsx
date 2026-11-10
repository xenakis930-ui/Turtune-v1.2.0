import { ChevronLeft, ChevronRight, Search, X, Minus, Square, X as CloseIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'
import { windowControls, isDesktop } from '../lib/api'

/**
 * Barra superior: navegación (atrás/adelante decorativas), buscador global
 * (atajo "/") y controles de ventana nativa (solo en Electron).
 */
export default function TopBar() {
  const query = usePlayerStore((s) => s.query)
  const setQuery = usePlayerStore((s) => s.setQuery)
  const clearQuery = usePlayerStore((s) => s.clearQuery)
  const inputRef = useRef(null)

  // Atajo "/" → enfocar buscador; Escape → limpiar
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        clearQuery()
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearQuery])

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/5 bg-black/20 px-4 pt-[env(safe-area-inset-top)]">
      {/* Historial (deshabilitado: una sola sesión de navegación) */}
      <div className="hidden items-center gap-2 sm:flex" aria-hidden>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-[#72868f]">
          <ChevronLeft size={20} />
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-black/60 text-[#72868f]">
          <ChevronRight size={20} />
        </span>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md flex-1">
        <Search
          size={18}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8ca0af]"
        />
        <input
          ref={inputRef}
          type="text"
          role="searchbox"
          aria-label="Buscar canciones en YouTube"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="¿Qué quieres escuchar?"
          spellCheck={false}
          autoComplete="off"
          className="h-11 w-full rounded-full border border-transparent bg-[#1e2c31] pl-11 pr-11 text-[14px] font-medium text-white placeholder-[#66798a] outline-none transition focus:border-white/20 focus:bg-[#242f3a]"
        />
        {query ? (
          <button
            type="button"
            onClick={clearQuery}
            aria-label="Borrar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8ca0af] transition hover:text-white"
          >
            <X size={18} />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[11px] font-semibold text-[#72868f] md:block">
            /
          </kbd>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Avatar decorativo */}
        <div
          className="hidden h-9 w-9 place-items-center rounded-full bg-[#15d3a2] text-sm font-black text-black md:grid"
          title="Usuario local — sesión sin cuenta de YouTube"
          aria-hidden
        >
          O
        </div>

        {/* Controles de ventana (solo escritorio) */}
        {isDesktop && (
          <div className="flex items-center gap-1" role="group" aria-label="Controles de ventana">
            <button
              type="button"
              onClick={windowControls.minimize}
              aria-label="Minimizar"
              className="grid h-8 w-9 place-items-center rounded text-[#8ca0af] transition hover:bg-white/10 hover:text-white"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              onClick={windowControls.toggleMaximize}
              aria-label="Maximizar o restaurar"
              className="grid h-8 w-9 place-items-center rounded text-[#8ca0af] transition hover:bg-white/10 hover:text-white"
            >
              <Square size={13} />
            </button>
            <button
              type="button"
              onClick={windowControls.close}
              aria-label="Cerrar"
              className="grid h-8 w-9 place-items-center rounded text-[#8ca0af] transition hover:bg-[#e81123] hover:text-white"
            >
              <CloseIcon size={17} />
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
