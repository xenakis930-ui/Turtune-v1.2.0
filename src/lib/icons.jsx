/**
 * icons.js — Catálogo centralizado de iconos de Turtune.
 *
 * Todos los iconos de la app se importan desde aquí (re-export de lucide-react).
 * Ventajas:
 *   - Un solo punto de cambio si se migra a otra librería (Heroicons, Phosphor…).
 *   - Tamaños consistentes vía `Icon` (abajo) o las constantes SIZE.
 *   - Documentación de uso por icono.
 *
 * Uso:
 *   import { Play, Pause, Search } from '../lib/icons'
 *   import { Icon } from '../lib/icons'
 *   <Icon name="Play" size="md" className="text-[#15d3a2]" />
 */

import {
  // Navegación y layout
  Home,
  Search,
  Library,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Minus,
  Square,
  X,
  ArrowRight,
  Globe,
  Import,

  // Reproducción
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Loader2,
  RotateCw,
  AudioLines,

  // Interacción
  Heart,
  ListPlus,
  ListMusic,
  Trash2,
  Keyboard,
  Plug,
  Unplug,

  // Estado y feedback
  AlertCircle,
  Info,
  CheckCircle2,
  Music2,
  History,
  Clock3,

  // Media / plataforma
  Youtube,
  Volume2,
  Volume1,
  VolumeX,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  Rocket,
} from '../lib/icons'

// Re-exportar todo con el mismo nombre
export * from 'lucide-react'

/** Tamaños estándar (px) para iconos en la app. */
export const SIZE = Object.freeze({ xs: 14, sm: 16, md: 20, lg: 24, xl: 32, xxl: 48 })

/**
 * Wrapper opcional que fuerza un tamaño consistente.
 * Uso: <Icon as={Play} size="md" className="text-[#15d3a2]" />
 */
export function Icon({ as: Component, size = 'md', className = '', ...rest }) {
  if (!Component) return null
  const px = typeof size === 'number' ? size : (SIZE[size] ?? SIZE.md)
  return <Component size={px} className={className} aria-hidden {...rest} />
}

/**
 * Mapa de iconos por contexto (para futuras referencias y documentación).
 * - Navegación: Home, Search, Library, Settings
 * - Reproducción: Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1
 * - Cola: ListMusic, ListPlus, Music2
 * - Volumen: Volume2, Volume1, VolumeX
 * - Estado: Loader2 (carga), AlertCircle (error), CheckCircle2 (éxito), Info
 * - Biblioteca: Heart (me gusta), History (recientes), Clock3 (duración)
 * - Plataforma: Youtube, Globe, ExternalLink, ShieldCheck
 * - UI: X, ChevronLeft/Right/Down, Minus, Square, ArrowRight, Keyboard, Import, Trash2
 * - Brand: AudioLines (logo), Rocket (actualizaciones), Plug/Unplug (conexión)
 */
export const ICON_CATALOG = Object.freeze({
  nav: { Home, Search, Library, Settings },
  playback: { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1 },
  queue: { ListMusic, ListPlus, Music2 },
  volume: { Volume2, Volume1, VolumeX },
  state: { Loader2, AlertCircle, CheckCircle2, Info },
  library: { Heart, History, Clock3 },
  platform: { Youtube, Globe, ExternalLink, ShieldCheck },
  ui: { X, ChevronLeft, ChevronRight, ChevronDown, Minus, Square, ArrowRight, Keyboard, Import, Trash2 },
  brand: { AudioLines, Rocket, Plug, Unplug, Eye, EyeOff, RefreshCw },
})
