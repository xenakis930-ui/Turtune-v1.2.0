import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Estado global: currentTrack, queue, playbackState (IDLE|LOADING|PLAYING|PAUSED|ERROR),
 * volumen, likes, historial y búsquedas recientes (persistidas en localStorage).
 */
export const PLAYBACK = Object.freeze({
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  ERROR: 'ERROR',
})

let toastSeq = 0

export const usePlayerStore = create(
  persist(
    (set, get) => ({
      // ---------- Navegación ----------
      view: 'home', // 'home' | 'search' | 'library'
      query: '',
      setView: (view) => set({ view }),
      setQuery: (query) => set(query.trim() ? { query, view: 'search' } : { query }),
      clearQuery: () => set({ query: '' }),

      // ---------- Reproducción ----------
      current: null, // Track | null
      queue: [], // Track[] — contexto completo (índice 0..n), current = queue[index]
      index: -1,
      playbackState: PLAYBACK.IDLE,
      currentTime: 0,
      duration: 0, // segundos (metadata o track.duration como fallback)
      buffering: false,
      buffered: 0, // segundos cargados por delante (para la seekbar)
      helpOpen: false, // overlay de atajos de teclado

      volume: 0.8,
      muted: false,
      shuffle: false,
      repeat: 'off', // 'off' | 'all' | 'one'
      queueOpen: false,

      setPlaybackState: (playbackState) => set({ playbackState }),
      setProgress: (currentTime) => set({ currentTime }),
      setBuffered: (buffered) =>
        set({ buffered: Math.max(0, Number(buffered) || 0) }),
      setDuration: (duration) =>
        set((s) => ({ duration: Number.isFinite(duration) && duration > 0 ? duration : s.duration })),
      setBuffering: (buffering) => set({ buffering }),
      toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
      setHelpOpen: (helpOpen) => set({ helpOpen: !!helpOpen }),

      // ---------- Colección local de playlists ----------
      /** Playlists guardadas por el usuario (pegadas una vez) — nunca suben a ningún sitio. */
      myPlaylists: [], // { id, title, itemCount, thumbnail, savedAt }
      savePlaylist: (p) =>
        set((s) => {
          if (!p?.id) return {}
          const rest = s.myPlaylists.filter((x) => x.id !== p.id)
          const merged = {
            thumbnail: p.thumbnail ?? '',
            itemCount: Number(p.itemCount) || 0,
            title: p.title ?? 'Playlist',
            savedAt: Date.now(),
            ...p,
          }
          return { myPlaylists: [merged, ...rest].slice(0, 50) }
        }),
      removePlaylist: (id) =>
        set((s) => ({ myPlaylists: s.myPlaylists.filter((x) => x.id !== id) })),

      /** Espejo local del navegador elegido en Ajustes (Tauri del estado real: main process). */
      cookieBrowser: 'none',
      setCookieBrowser: (cookieBrowser) => set({ cookieBrowser }),

      // ---------- Importar playlist ----------
      importOpen: false,
      openImport: () => set({ importOpen: true }),
      closeImport: () => set({ importOpen: false }),
      /** Añade un lote a la cola (sin un toast por pista). */
      appendToQueue: (tracks) =>
        set((s) => (Array.isArray(tracks) && tracks.length ? { queue: [...s.queue, ...tracks] } : {})),

      setVolume: (volume) => {
        const v = Math.min(1, Math.max(0, Number(volume) || 0))
        set({ volume: v, muted: v === 0 ? get().muted : false })
      },
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
      cycleRepeat: () =>
        set((s) => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),
      toggleQueue: () => set((s) => ({ queueOpen: !s.queueOpen })),

      /** Comienza una pista dentro de un contexto (lista de resultados, biblioteca…). */
      beginTrack: (track, list, index) => {
        const ctx = Array.isArray(list) && list.length ? list : [track]
        const idx = Number.isInteger(index) && index >= 0 ? index : ctx.findIndex((t) => t.id === track.id)
        set({
          current: track,
          queue: ctx,
          index: idx === -1 ? 0 : idx,
          playbackState: PLAYBACK.LOADING,
          buffering: false,
          currentTime: 0,
          duration: track?.duration ?? 0,
          buffered: 0,
        })
        get().recordHistory(track)
      },

      /** Fija un índice de la cola como actual (usado por next/prev/skip-queue). */
      setQueueIndex: (index) => {
        const s = get()
        const track = s.queue[index]
        if (!track) return
        set({
          index,
          current: track,
          playbackState: PLAYBACK.LOADING,
          buffering: false,
          currentTime: 0,
          duration: track?.duration ?? 0,
          buffered: 0,
        })
        get().recordHistory(track)
      },

      stopAtEndOfQueue: () => {
        const s = get()
        set({ playbackState: PLAYBACK.IDLE, currentTime: s.duration || 0, buffering: false })
      },

      // ---------- Cola ----------
      /** Añade al final de la cola; no interrumpe la pista actual. */
      addToQueue: (track) => {
        set((s) => (s.current ? { queue: [...s.queue, track] } : { queue: [...s.queue, track] }))
        get().pushToast('info', `Añadida a la cola: ${track.title}`)
      },
      /** Inserta como siguiente en la cola. */
      playNext: (track) =>
        set((s) => {
          const q = [...s.queue]
          q.splice(s.index + 1, 0, track)
          return { queue: q }
        }),
      /** Elimina un ítem FUTURO de la cola (no el actual). */
      removeFromQueue: (removeAt) =>
        set((s) => {
          if (removeAt <= s.index || removeAt >= s.queue.length) return {}
          const q = s.queue.filter((_, i) => i !== removeAt)
          return { queue: q }
        }),
      /** Limpia todo lo que hay después del índice actual. */
      clearUpNext: () => set((s) => ({ queue: s.queue.slice(0, s.index + 1) })),

      // ---------- Me gusta ----------
      liked: [], // Track[]
      toggleLike: (track) =>
        set((s) => {
          const exists = s.liked.some((t) => t.id === track.id)
          return {
            liked: exists ? s.liked.filter((t) => t.id !== track.id) : [track, ...s.liked].slice(0, 200),
          }
        }),
      /** Añade un lote a Me gusta (deduplicado, newest-first, tope 200). */
      likeMany: (tracks) =>
        set((s) => {
          const merged = [...(Array.isArray(tracks) ? tracks : []), ...s.liked]
          const seen = new Set()
          const liked = []
          for (const t of merged) {
            if (!t?.id || seen.has(t.id)) continue
            seen.add(t.id)
            liked.push(t)
            if (liked.length >= 200) break
          }
          return { liked }
        }),

      // ---------- Historial ----------
      history: [], // Track[] con playedAt
      recordHistory: (track) =>
        set((s) => ({
          history: [
            { ...track, playedAt: Date.now() },
            ...s.history.filter((t) => t.id !== track.id),
          ].slice(0, 40),
        })),

      // ---------- Búsquedas recientes ----------
      recentSearches: [],
      addRecentSearch: (q) =>
        set((s) => {
          const clean = String(q ?? '').trim()
          if (!clean) return {}
          return {
            recentSearches: [clean, ...s.recentSearches.filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, 10),
          }
        }),
      removeRecentSearch: (q) =>
        set((s) => ({ recentSearches: s.recentSearches.filter((r) => r !== q) })),

      // ---------- Toasts ----------
      toasts: [], // { id, type, text }
      pushToast: (type, text) =>
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id: ++toastSeq, type, text: String(text) }] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'octave-storage', // nombre legado v1 — se conserva para no perder likes/historial
      storage: createJSONStorage(() => localStorage),
      /**
       * Rehidratación segura: restaura la cola y la posición, pero la sesión
       * arranca SIEMPRE en IDLE (sin autoplay ni estado roto a medias).
       */
      merge: (persistedState, currentState) => {
        const p = persistedState ?? {}
        const queue = Array.isArray(p.queue) ? p.queue.filter((t) => t?.id) : []
        const index = Number.isInteger(p.index)
          ? Math.min(Math.max(0, p.index), Math.max(0, queue.length - 1))
          : queue.length - 1
        const current = queue[index] ?? null
        return {
          ...currentState,
          ...p,
          queue,
          index: queue.length ? index : -1,
          current,
          playbackState: PLAYBACK.IDLE,
          buffering: false,
          currentTime: 0,
          duration: current?.duration ?? 0,
          buffered: 0,
        }
      },
      // Nunca persistimos currentTime/playbackState/buffering para no resucitar sesiones rotas
      partialize: (s) => ({
        volume: s.volume,
        muted: s.muted,
        shuffle: s.shuffle,
        repeat: s.repeat,
        liked: s.liked,
        history: s.history,
        recentSearches: s.recentSearches,
        queue: s.queue.slice(0, 100), // tope pragmático de tamaño
        index: s.index,
        cookieBrowser: s.cookieBrowser,
        myPlaylists: s.myPlaylists,
      }),
    },
  ),
)
