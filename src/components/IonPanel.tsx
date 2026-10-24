import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { ionConcentrations } from '../lib/ph'
import { isInBufferRegion } from '../lib/stage'
import { AtomIcon, WavesIcon } from './Icons'

const LOG_MIN = -14
const LOG_MAX = 0

function logScale(c: number) {
  const logC = Math.log10(Math.max(c, 1e-15))
  return Math.max(0, Math.min(1, (logC - LOG_MIN) / (LOG_MAX - LOG_MIN)))
}

interface BarProps {
  label: string
  value: number
  color: string
  highlight?: boolean
}

function IonBar({ label, value, color, highlight }: BarProps) {
  const fraction = logScale(value)
  const logVal = Math.log10(Math.max(value, 1e-15))

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold w-14 text-right shrink-0" style={{ color: 'var(--color-text)' }}>
        {label}
      </span>
      <div
        className="relative flex-1 h-3.5 rounded-full overflow-hidden"
        style={{
          background: 'var(--color-surface2)',
          boxShadow: highlight ? `0 0 0 2px ${color}` : 'inset 0 0 0 1px var(--color-border)',
          transition: 'box-shadow 0.3s',
        }}
      >
        {/* 10⁻⁷ guide */}
        <span aria-hidden="true" className="absolute top-0 bottom-0" style={{ left: '50%', width: 1, background: 'var(--color-border-strong)' }} />
        <div
          className="h-full rounded-full"
          style={{
            width: `${fraction * 100}%`,
            background: `linear-gradient(90deg, color-mix(in srgb, ${color} 45%, transparent), ${color})`,
            transition: 'width 0.2s ease-out',
          }}
        />
      </div>
      <span className="text-xs w-[4.5rem] shrink-0 mono" style={{ color: 'var(--color-text)' }}>
        10<sup>{logVal.toFixed(1)}</sup>
      </span>
    </div>
  )
}

export default function IonPanel() {
  const { t } = useTranslation()
  const { state } = useSim()

  const { hPlus, ohMinus } = ionConcentrations(state.currentPH)

  const { acidInBeaker } = state

  // Buffer region: weak species present on BOTH sides of equivalence
  const inBufferRegion = isInBufferRegion(state)

  // Species concentrations (mol/L) — corrected for acidInBeaker direction
  const { weakSpecies, conjugate } = useMemo(() => {
    const sampleMol = state.sampleConc * (state.sampleVol / 1000)
    const addedMol = state.titrantConc * (state.addedVol / 1000)
    const total = (state.sampleVol + state.addedVol) / 1000

    if (state.acidInBeaker) {
      // Acid (HA) in beaker, base added → HA decreases, A⁻ increases
      const ha = Math.max(0, sampleMol - addedMol) / total
      const aConj = Math.min(addedMol, sampleMol) / total
      return { weakSpecies: ha, conjugate: aConj }
    } else {
      // Base (B) in beaker, acid added → B decreases, BH⁺ increases
      const b = Math.max(0, sampleMol - addedMol) / total
      const bh = Math.min(addedMol, sampleMol) / total
      return { weakSpecies: b, conjugate: bh }
    }
  }, [state])

  const weakLabel = acidInBeaker ? t('ions.acid') : t('ions.base')
  const conjLabel = acidInBeaker ? '[A⁻]' : '[BH⁺]'

  const dominance = Math.abs(state.currentPH - 7) < 0.5 ? 'dominantNeutral' : state.currentPH < 7 ? 'dominantAcid' : 'dominantBase'

  return (
    <div className="card flex flex-col gap-2.5 p-4 h-full" style={{ color: 'var(--color-text)' }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="card-title m-0">
          <span className="card-title-icon"><AtomIcon size={16} /></span>
          {t('ions.title')}
        </h2>
        {inBufferRegion && (
          <span className="chip chip-success anim-pop">
            <WavesIcon size={13} /> {t('ions.bufferRegion')}
          </span>
        )}
      </div>

      {/* Log scale axis labels */}
      <div className="flex items-center gap-2 mt-1">
        <span className="w-14 shrink-0" />
        <div className="flex-1 flex justify-between text-[10.5px] mono" style={{ color: 'var(--color-text-muted)' }}>
          <span>10⁻¹⁴</span>
          <span>10⁻⁷</span>
          <span>10⁰</span>
        </div>
        <span className="w-[4.5rem] shrink-0" />
      </div>

      <IonBar label={t('ions.hPlus')}   value={hPlus}        color="#ef4444" />
      <IonBar label={t('ions.ohMinus')} value={ohMinus}      color="#3b82f6" />
      <IonBar label={weakLabel}         value={weakSpecies}  color="#f97316" highlight={inBufferRegion} />
      <IonBar label={conjLabel}         value={conjugate}    color="#8b5cf6" highlight={inBufferRegion} />

      <div className="text-[10.5px] text-center" style={{ color: 'var(--color-text-muted)' }}>{t('ions.logScale')}</div>

      {/* Which ion dominates */}
      <div
        className="rounded-xl px-3 py-2 text-xs font-semibold text-center"
        style={{
          background: dominance === 'dominantAcid' ? 'var(--color-danger-soft)' : dominance === 'dominantBase' ? 'rgba(59,130,246,0.12)' : 'var(--color-success-soft)',
          color: dominance === 'dominantAcid' ? 'var(--color-danger)' : dominance === 'dominantBase' ? '#3b82f6' : 'var(--color-success)',
          transition: 'background-color 0.3s, color 0.3s',
        }}
      >
        {t(`ions.${dominance}`)}
      </div>

      {/* pH readout */}
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {[
          ['pH', state.currentPH.toFixed(2)],
          ['[H⁺]', hPlus.toExponential(2)],
          ['[OH⁻]', ohMinus.toExponential(2)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg py-1.5" style={{ background: 'var(--color-surface2)' }}>
            <div className="text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>{k}</div>
            <div className="mono text-[12px] font-bold">{v}</div>
          </div>
        ))}
      </div>

      {inBufferRegion && (
        <div className="text-xs p-2.5 rounded-xl anim-fade-up" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
          <div className="font-bold mb-0.5">{t('ions.formula')}</div>
          <div className="mono">
            {acidInBeaker
              ? 'pH = pKa + log([A⁻]/[HA])'
              : 'pOH = pKb + log([BH⁺]/[B])'}
          </div>
        </div>
      )}
    </div>
  )
}
