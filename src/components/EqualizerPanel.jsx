import { useState } from 'react'
import { Sliders } from '../lib/icons'
import { usePlayerStore } from '../store/usePlayerStore'
import { EQ_PRESETS, EQ_BAND_LABELS, EQ_BAND_FREQS, EQ_NUM_BANDS } from '../audio/equalizer'

const PRESET_NAMES = ['flat', 'rock', 'pop', 'jazz', 'classical', 'bass', 'vocal', 'electronic', 'acoustic', 'loudness']
const PRESET_LABELS = {
  flat: 'Plano', rock: 'Rock', pop: 'Pop', jazz: 'Jazz',
  classical: 'Clásica', bass: 'Bajos', vocal: 'Vocal', electronic: 'Electrónica',
  acoustic: 'Acústica', loudness: 'Loudness',
}

export default function EqualizerPanel() {
  const [open, setOpen] = useState(false)
  const eqEnabled = usePlayerStore((s) => s.eqEnabled)
  const eqPreset = usePlayerStore((s) => s.eqPreset)
  const eqBands = usePlayerStore((s) => s.eqBands)
  const setEqEnabled = usePlayerStore((s) => s.setEqEnabled)
  const setEqPreset = usePlayerStore((s) => s.setEqPreset)
  const setEqBands = usePlayerStore((s) => s.setEqBands)

  const bands = Array.isArray(eqBands) ? eqBands : [0, 0, 0, 0, 0, 0, 0]

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-4 py-2.5 text-[12px] font-bold text-[#8ca0af] transition hover:text-white"
      >
        <span className="flex items-center gap-2">
          <Sliders size={14} className="text-[#15d3a2]" aria-hidden />
          Ecualizador
        </span>
        <span className="text-[10px] uppercase tracking-wider">
          {eqEnabled ? (PRESET_LABELS[eqPreset] || eqPreset) : 'Desactivado'}
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-white/5 bg-[#0c1718] p-4">
          {/* On/Off */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold text-white">Activar EQ</span>
            <button
              type="button"
              onClick={() => setEqEnabled(!eqEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${eqEnabled ? 'bg-[#15d3a2]' : 'bg-white/10'}`}
              aria-pressed={eqEnabled}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${eqEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          {/* Presets */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {PRESET_NAMES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => { setEqPreset(name); setEqEnabled(true) }}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                  eqPreset === name && eqEnabled
                    ? 'border-[#15d3a2] bg-[#15d3a2]/15 text-[#15d3a2]'
                    : 'border-white/10 text-[#8ca0af] hover:text-white'
                }`}
              >
                {PRESET_LABELS[name]}
              </button>
            ))}
          </div>

          {/* 7 bandas */}
          <div className="flex items-end justify-between gap-1" style={{ height: 120 }}>
            {bands.map((val, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[9px] tabular-nums text-[#15d3a2]">{val > 0 ? `+${val}` : val}</span>
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
                  className="eq-slider"
                  style={{
                    '--fill': `${((val + 12) / 24) * 100}%`,
                    height: 80,
                  }}
                  orient="vertical"
                />
                <span className="text-[9px] font-semibold text-[#8ca0af]">{EQ_BAND_LABELS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
