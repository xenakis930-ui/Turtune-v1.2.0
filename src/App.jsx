import { useEffect } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import HomeView from './components/HomeView'
import SearchView from './components/SearchView'
import LibraryView from './components/LibraryView'
import SettingsView from './components/SettingsView'
import DiscoverView from './components/DiscoverView'
import PlayerBar from './components/PlayerBar'
import QueuePanel from './components/QueuePanel'
import ToastStack from './components/ToastStack'
import ShortcutsOverlay from './components/ShortcutsOverlay'
import ImportPlaylistModal from './components/ImportPlaylistModal'
import MobileNav from './components/MobileNav'
import ExpandedPlayer from './components/ExpandedPlayer'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { usePlayerStore } from './store/usePlayerStore'
import { initEngine, togglePlay, next, previous } from './audio/engine'

/**
 * Layout raíz estilo Spotify:
 *   ┌──────────┬───────────────────────┐
 *   │ Sidebar  │ TopBar (búsqueda)     │
 *   │          ├───────────────────────┤
 *   │          │ Vista (home/search…)  │
 *   ├──────────┴───────────────────────┤
 *   │ PlayerBar (footer persistente)   │
 *   └──────────────────────────────────┘
 */
export default function App() {
  const view = usePlayerStore((s) => s.view)
  useKeyboardShortcuts()

  useEffect(() => {
    initEngine()
    // Bandeja del sistema (solo en la app de escritorio)
    const off = []
    if (window.turtune?.onTray) {
      off.push(window.turtune.onTray('play', () => togglePlay()))
      off.push(window.turtune.onTray('next', () => next(false)))
      off.push(window.turtune.onTray('previous', () => previous()))
    }
    // Sincroniza estado de reproducción con el mini reproductor (gadget flotante)
    if (window.turtune?.mini?.sendState) {
      const syncMini = () => {
        const s = usePlayerStore.getState()
        window.turtune.mini.sendState({
          current: s.current,
          playbackState: s.playbackState,
        })
      }
      syncMini()
      const unsub = usePlayerStore.subscribe(syncMini)
      off.push(() => { try { unsub() } catch { /* noop */ } })
    }
    // Notificaciones de escritorio al cambiar de pista (solo si la ventana no tiene foco)
    let lastNotifiedId = null
    const unsubNotif = usePlayerStore.subscribe((state) => {
      const cur = state.current
      if (!cur || cur.id === lastNotifiedId) return
      if (state.playbackState !== PLAYBACK.PLAYING) return
      if (typeof document !== 'undefined' && document.hasFocus()) return
      lastNotifiedId = cur.id
      try {
        if ('Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(cur.title || 'Turtune', {
              body: cur.artist || '',
              icon: cur.thumbnail || undefined,
              tag: 'turtune-track',
              silent: false,
            })
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then((p) => {
              if (p === 'granted') {
                new Notification(cur.title || 'Turtune', {
                  body: cur.artist || '',
                  icon: cur.thumbnail || undefined,
                  tag: 'turtune-track',
                })
              }
            }).catch(() => {})
          }
        }
      } catch { /* noop */ }
    })
    off.push(() => { try { unsubNotif() } catch { /* noop */ } })
    // Aviso único si la cola persistida se restauró
    const restored = usePlayerStore.getState().current
    if (restored) {
      usePlayerStore.getState().pushToast(
        'info',
        `Sesión restaurada — pulsa Play para seguir con «${String(restored.title).slice(0, 48)}»`,
      )
    }
    return () => off.forEach((fn) => { try { fn() } catch { /* noop */ } })
  }, [])

  return (
    <div className="no-select flex h-screen w-screen flex-col overflow-hidden bg-base text-white">
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        <Sidebar />

        <main className="main-ambient flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] shadow-[0_18px_44px_rgba(0,0,0,0.35)]">
          <TopBar />
          <div className="min-h-0 flex-1 view-enter" role="main" key={view}>
            {view === 'home' && <HomeView />}
            {view === 'search' && <SearchView />}
            {view === 'library' && <LibraryView />}
            {view === 'discover' && <DiscoverView />}
            {view === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      <PlayerBar />
      <MobileNav />
      <QueuePanel />
      <ToastStack />
      <ShortcutsOverlay />
      <ImportPlaylistModal />
      <ExpandedPlayer />
    </div>
  )
}
