import { X, Keyboard } from 'lucide-react'
import { usePlayerStore } from '../store/usePlayerStore'

const GROUPS = [
  {
    title: 'Reproducción',
    rows: [
      ['Espacio / K', 'Play · Pausa'],
      ['N', 'Siguiente pista'],
      ['P', 'Pista anterior (o reiniciar si lleva >4 s)'],
      ['M', 'Silenciar / activar sonido'],
    ],
  },
  {
    title: 'Seek y volumen',
    rows: [
      ['←', 'Retroceder 5 s'],
      ['→', 'Avanzar 5 s'],
      ['↑', 'Subir volumen'],
      ['↓', 'Bajar volumen'],
    ],
  },
  {
    title: 'Interfaz',
    rows: [
      ['Q', 'Abrir / cerrar la cola'],
      ['L', 'Me gusta en la pista actual'],
      ['/', 'Enfocar el buscador'],
      ['Esc', 'Cerrar overlay o la cola / limpiar búsqueda'],
      ['?', 'Mostrar / ocultar esta ayuda'],
    ],
  },
]

function Kbd({ children }) {
  return (
    <kbd className="inline-flex min-w-7 items-center justify-center rounded-md border border-white/15 bg-white/[0.08] px-2 py-1 text-[11px] font-bold tracking-wide text-white shadow-[0_2px_0_rgba(255,255,255,0.06)]">
      {children}
    </kbd>
  )
}

/** Overlay modal con los atajos de teclado (se abre con «?»). */
export default function ShortcutsOverlay() {
  const open = usePlayerStore((s) => s.helpOpen)
  const setHelpOpen = usePlayerStore((s) => s.setHelpOpen)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Atajos de teclado"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Cerrar atajos de teclado"
        onClick={() => setHelpOpen(false)}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[2px]"
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#141f22] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#15d3a2]/15">
              <Keyboard size={19} className="text-[#15d3a2]" aria-hidden />
            </span>
            <h2 className="text-lg font-extrabold tracking-tight text-white">Atajos de teclado</h2>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            aria-label="Cerrar"
            className="rounded-md p-2 text-[#8ca0af] transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#15d3a2]">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.rows.map(([keys, desc]) => (
                  <li key={keys} className="flex items-center justify-between gap-3">
                    <span className="flex shrink-0 items-center gap-1">
                      {keys.split(' / ').map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-[10px] text-[#72868f]">/</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </span>
                    <span className="text-right text-[12px] leading-tight text-[#8ca0af]">{desc}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="border-t border-white/5 px-6 py-3 text-center text-[11px] text-[#72868f]">
          Pulsa <Kbd>Esc</Kbd> para cerrar
        </div>
      </div>
    </div>
  )
}
