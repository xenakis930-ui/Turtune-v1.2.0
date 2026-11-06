import { useEffect } from 'react'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import HomeView from './components/HomeView'
import SearchView from './components/SearchView'
import LibraryView from './components/LibraryView'
import SettingsView from './components/SettingsView'
import PlayerBar from './components/PlayerBar'
import QueuePanel from './components/QueuePanel'
import ToastStack from './components/ToastStack'
import ShortcutsOverlay from './components/ShortcutsOverlay'
import ImportPlaylistModal from './components/ImportPlaylistModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { usePlayerStore } from './store/usePlayerStore'
import { initEngine } from './audio/engine'

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
    // Aviso único si la cola persistida se restauró
    const restored = usePlayerStore.getState().current
    if (restored) {
      usePlayerStore.getState().pushToast(
        'info',
        `Sesión restaurada — pulsa Play para seguir con «${String(restored.title).slice(0, 48)}»`,
      )
    }
  }, [])

  return (
    <div className="no-select flex h-screen w-screen flex-col overflow-hidden bg-base text-white">
      <div className="flex min-h-0 flex-1 gap-2 p-2">
        <Sidebar />

        <main className="main-ambient flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] shadow-[0_18px_44px_rgba(0,0,0,0.35)]">
          <TopBar />
          <div className="min-h-0 flex-1" role="main">
            {view === 'home' && <HomeView />}
            {view === 'search' && <SearchView />}
            {view === 'library' && <LibraryView />}
            {view === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      <PlayerBar />
      <QueuePanel />
      <ToastStack />
      <ShortcutsOverlay />
      <ImportPlaylistModal />
    </div>
  )
}
