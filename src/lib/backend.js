/**
 * backend.js — URL del backend Turtune (para la app Android o cualquier
 * cliente sin puente Electron). Persistida en localStorage.
 *
 * En la app de escritorio esta URL se ignora: ahí se usa window.turtune (IPC).
 */

const KEY = 'turtune-backend-url'

function isCapacitor() {
  return typeof window !== 'undefined' && !!window.Capacitor
}

export function getBackendUrl() {
  try {
    const stored = (localStorage.getItem(KEY) ?? '').trim()
    if (stored) return stored
    // En la app Android (Capacitor) sin backend configurado, usar el host del PC
    // (emulador → 10.0.2.2; teléfono físico → cambiar en Ajustes)
    if (isCapacitor()) return 'http://10.0.2.2:8787'
    return ''
  } catch {
    return ''
  }
}

export function setBackendUrl(url) {
  try {
    const clean = String(url ?? '').trim().replace(/\/+$/, '')
    if (clean) localStorage.setItem(KEY, clean)
    else localStorage.removeItem(KEY)
    return clean
  } catch {
    return ''
  }
}

export function hasBackend() {
  return getBackendUrl() !== ''
}

/** Construye una URL absoluta del backend (o null si no hay backend). */
export function backendUrl(path) {
  const base = getBackendUrl()
  if (!base) return null
  return `${base}${path.startsWith('/') ? path : '/' + path}`
}
