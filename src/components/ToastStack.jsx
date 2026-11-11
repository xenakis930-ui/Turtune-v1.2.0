import { useEffect } from 'react'
import { AlertCircle, Info, X } from '../lib/icons'
import { usePlayerStore } from '../store/usePlayerStore'

const AUTO_DISMISS_MS = 4500

/** Pila de notificaciones flotantes (errores de stream, confirmaciones…). */
export default function ToastStack() {
  const toasts = usePlayerStore((s) => s.toasts)
  const dismissToast = usePlayerStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toasts.length) return
    const timers = toasts.map((t) => setTimeout(() => dismissToast(t.id), AUTO_DISMISS_MS))
    return () => timers.forEach(clearTimeout)
  }, [toasts, dismissToast])

  if (!toasts.length) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-[92px] left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error'
        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border px-4 py-3 shadow-2xl backdrop-blur-md ${
              isError
                ? 'border-[#f87171]/30 bg-[#2a1215]/95 text-[#fecaca]'
                : 'border-white/10 bg-[#242424]/95 text-[#e5e5e5]'
            }`}
          >
            {isError ? (
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-[#f87171]" aria-hidden />
            ) : (
              <Info size={18} className="mt-0.5 shrink-0 text-[#15d3a2]" aria-hidden />
            )}
            <p className="min-w-0 flex-1 text-[13px] leading-snug">{toast.text}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Descartar aviso"
              className="shrink-0 rounded p-1 opacity-70 transition hover:opacity-100"
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
