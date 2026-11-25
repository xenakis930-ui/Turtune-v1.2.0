import { useState } from 'react'
import { Sliders, X } from '../lib/icons'
import { usePlayerStore } from '../store/usePlayerStore'
import { EQ_PRESETS, EQ_BAND_LABELS } from '../audio/equalizer'

const PRESET_NAMES = ['flat', 'rock', 'pop', 'jazz', 'classical', 'bass', 'vocal', 'electronic', 'acoustic', 'loudness']
const PRESET_LABELS = {
  flat: 'Plano', rock: 'Rock', pop: 'Pop', jazz: 'Jazz',
  classical: 'ClÃ¡sica', bass: 'Bajos', vocal: 'Vocal', electronic: 'ElectrÃ³nica',
  acoustic: 'AcÃºstica', loudness: 'Loudness',
}

export default function EqualizerModal() {
  const [open, setOpen] = useState(false)
  const eqEnabled = usePlayerStore((s) => s.eqEnabled)
  const eqPreset = usePlayerStore((s) => s.eqPreset)
  const eqBands = usePlayerStore((s) => s.eqBands)
  const setEqEnabled = usePlayerStore((s) => s.setEqEnabled)
  const setEqPreset = usePlayerStore((s) => s.setEqPreset)
  const setEqBands = usePlayerStore((s) => s.setEqBands)

  const bands = Array.isArray(eqBands) ? eqBands : [0, 0, 0, 0, 0, 0, 0]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ecualizador"
        title="Ecualizador"
        className="rounded-md p-2 text-[#8ca0af] transition hover:bg-white/5 hover:text-white"
      >
        <Sliders size={19} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1718] p-6 shadow-2xl"

          >
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[14px] font-bold text-white">
                <Sliders size={16} className="text-[#15d3a2]" aria-hidden />
                Ecualizador
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-[#8ca0af] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            {/* On/Off toggle */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-white">Activar EQ</span>
              <button
                type="button"
                onClick={() => setEqEnabled(!eqEnabled)}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-0 p-0 transition-colors"
                style={{ backgroundColor: eqEnabled ? '#15d3a2' : 'rgba(255,255,255,0.1)' }}
                aria-pressed={eqEnabled}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform"
                  style={{
                    marginTop: 2,
                    marginLeft: 2,
                    transform: eqEnabled ? 'translateX(20px)' : 'translateX(0)',
                  }}
                />
              </button>
            </div>

            {/* Presets */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {PRESET_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => { console.warn('[MODAL] preset clicked:', name); setEqPreset(name); setEqEnabled(true) }}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                    eqPreset === name && eqEnabled
                      ? 'border-[#15d3a2] bg-[#15d3a2]/15 text-[#15d3a2]'
                      : 'border-white/10 text-[#8ca0af] hover:text-white hover:border-white/20'
                  }`}
                >
                  {PRESET_LABELS[name]}
                </button>
              ))}
            </div>

            {/* 7 bandas - horizontal sliders */}
            <div className="flex flex-col gap-3">
              {bands.map((val, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-8 text-right text-[11px] font-bold text-[#8ca0af]">{EQ_BAND_LABELS[i]}</span>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={val}
                    onChange={(e) => {
                      const newBands = [...bands]
                      newBands[i] = Number(e.target.value)
                      setEqBands(newBands)
                      setEqPreset('custom')
                    }}
                    className="oct-range flex-1"
                    style={{ '--fill': `${((val + 12) / 24) * 100}%` }}
                  />
                  <span className="w-8 text-right text-[11px] tabular-nums text-[#15d3a2]">{val > 0 ? `+${val}` : val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
