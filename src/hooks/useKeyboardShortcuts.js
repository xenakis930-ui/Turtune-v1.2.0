import { useEffect } from 'react'
import { usePlayerStore } from '../store/usePlayerStore'
import { togglePlay, next, previous, seekTo, setVolume, toggleMute } from '../audio/engine'

const SEEK_STEP_S = 5
const VOLUME_STEP = 0.05

/**
 * Atajos globales de teclado:
 *   Espacio / K  play · pausa        ← / →  retroceder / avanzar 5 s
 *   N / P        siguiente / anterior   ↑ / ↓  subir / bajar volumen
 *   M            silenciar              Q      abrir/cerrar cola
 *   L            me gusta (actual)      ?      overlay de atajos
 *   Esc          cerrar overlay/cola o limpiar búsqueda
 *   /            enfocar buscador (gestionado en TopBar)
 * Se ignoran cuando el usuario escribe en un campo de texto.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target
      const tag = target?.tagName
      const typing =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable === true
      const store = usePlayerStore.getState()

      // Escape funciona incluso dentro de inputs
      if (e.key === 'Escape') {
        if (store.helpOpen) store.setHelpOpen(false)
        else if (store.importOpen) store.closeImport()
        else if (store.queueOpen) store.toggleQueue()
        else if (typing && typeof target?.blur === 'function') target.blur()
        return
      }

      if (typing) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key) {
        case ' ':
        case 'Spacebar': // compatibilidad
        case 'k':
        case 'K':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          seekTo(store.currentTime - SEEK_STEP_S)
          break
        case 'ArrowRight':
          e.preventDefault()
          seekTo(store.currentTime + SEEK_STEP_S)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(store.volume + VOLUME_STEP)
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(store.volume - VOLUME_STEP)
          break
        case 'n':
        case 'N':
          next(false)
          break
        case 'p':
        case 'P':
          previous()
          break
        case 'm':
        case 'M':
          toggleMute()
          break
        case 'q':
        case 'Q':
          store.toggleQueue()
          break
        case 'l':
        case 'L':
          if (store.current) store.toggleLike(store.current)
          break
        case '?':
          store.toggleHelp()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
