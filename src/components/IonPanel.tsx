import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { ionConcentrations } from '../lib/ph'

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
      <span className="text-xs w-14 text-right shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <div
        className="flex-1 h-4 rounded overflow-hidden"
        style={{
          background: 'var(--color-surface2)',
          outline: highlight ? `1.5px solid ${color}` : 'none',
        }}
      >
        <div
          className="h-full rounded transition-all duration-150"
          style={{ width: `${fraction * 100}%`, background: color, opacity: highlight ? 1 : 0.7 }}
        />
      </div>
      <span className="text-xs w-20 shrink-0 font-mono" style={{ color: 'var(--color-text)' }}>
        10<sup>{logVal.toFixed(1)}</sup>
      </span>
    </div>
  )
}

export default function IonPanel() {
  const { t } = useTranslation()
  const { state } = useSim()

  const { hPlus, ohMinus } = ionConcentrations(state.currentPH)

  const { equivVol, addedVol, acidId, baseId, acidInBeaker } = state
  const isWeakAcid = acidId === 'CH3COOH' || acidId === 'H3PO4'
  const isWeakBase = baseId === 'NH3'

  // Buffer region: weak species present on BOTH sides of equivalence
  const inBufferRegion =
    (acidInBeaker ? (isWeakAcid && !isWeakBase) : (isWeakBase && !isWeakAcid)) &&
    addedVol > equivVol * 0.05 &&
    addedVol < equivVol * 0.98

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

  return (
    <div
      className="flex flex-col gap-2 p-3"
      style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t('ions.title')}</span>
        {inBufferRegion && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#22c55e22', color: '#16a34a' }}>
            {t('ions.bufferRegion')}
          </span>
        )}
      </div>

      {/* Log scale axis labels */}
      <div className="flex items-center gap-2">
        <span className="text-xs w-14" />
        <div className="flex-1 flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>10⁻¹⁴</span>
          <span>10⁻⁷</span>
          <span>10⁰</span>
        </div>
        <span className="text-xs w-20" />
      </div>

      <IonBar label={t('ions.hPlus')}   value={hPlus}        color="#ef4444" />
      <IonBar label={t('ions.ohMinus')} value={ohMinus}      color="#3b82f6" />
      <IonBar label={weakLabel}         value={weakSpecies}  color="#f97316" highlight={inBufferRegion} />
      <IonBar label={conjLabel}         value={conjugate}    color="#8b5cf6" highlight={inBufferRegion} />

      {/* pH readout */}
      <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>pH = {state.currentPH.toFixed(2)}</span>
        <span>[H⁺] = {hPlus.toExponential(2)}</span>
        <span>[OH⁻] = {ohMinus.toExponential(2)}</span>
      </div>

      {inBufferRegion && (
        <div className="text-xs p-2 rounded" style={{ background: '#22c55e11', color: '#16a34a' }}>
          Henderson–Hasselbalch: pH = pKa + log([A⁻]/[HA])
        </div>
      )}
    </div>
  )
}
