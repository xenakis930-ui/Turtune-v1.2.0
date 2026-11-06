import { useState } from 'react'
import { Music2 } from 'lucide-react'

/** Carátula con fallback elegante si la imagen no carga (offline / id inválido). */
export default function Thumb({ src, alt = '', className = '', iconSize = 28 }) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#1e2c31] to-[#141f22] text-white/40 ${className}`}
        role="img"
        aria-label={alt || 'Carátula no disponible'}
      >
        <Music2 size={iconSize} strokeWidth={1.5} />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  )
}
