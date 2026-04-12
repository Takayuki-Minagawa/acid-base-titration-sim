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
  isBuffer?: boolean
}

function IonBar({ label, value, color, isBuffer }: BarProps) {
  const fraction = logScale(value)
  const logVal = Math.log10(Math.max(value, 1e-15))

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-14 text-right shrink-0" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: 'var(--color-surface2)' }}>
        <div
          className="h-full rounded transition-all duration-200"
          style={{ width: `${fraction * 100}%`, background: color, opacity: isBuffer ? 1 : 0.8 }}
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

  // Detect buffer region: near half-equiv volume and weak acid/base
  const { equivVol, addedVol, acidId, baseId } = state
  const isWeakAcid = acidId === 'CH3COOH' || acidId === 'H3PO4'
  const isWeakBase = baseId === 'NH3'
  const halfEquiv = equivVol * 0.5
  const inBufferRegion =
    (isWeakAcid || isWeakBase) &&
    addedVol > halfEquiv * 0.2 &&
    addedVol < equivVol * 0.98

  // Approximate acid and conjugate base concentrations
  const { acidMol, baseMol } = useMemo(() => {
    const sampleMol = state.sampleConc * (state.sampleVol / 1000)
    const addedMol = state.titrantConc * (state.addedVol / 1000)
    const total = (state.sampleVol + state.addedVol) / 1000
    return {
      acidMol: Math.max(0, sampleMol - addedMol) / total,
      baseMol: Math.max(0, addedMol - sampleMol) / total + (addedMol < sampleMol ? addedMol / total : 0),
    }
  }, [state])

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

      <IonBar label={t('ions.hPlus')} value={hPlus} color="#ef4444" />
      <IonBar label={t('ions.ohMinus')} value={ohMinus} color="#3b82f6" />
      <IonBar label={t('ions.acid')} value={acidMol} color="#f97316" isBuffer={inBufferRegion} />
      <IonBar label={t('ions.base')} value={baseMol} color="#8b5cf6" isBuffer={inBufferRegion} />

      {/* Current pH display */}
      <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>pH = {state.currentPH.toFixed(2)}</span>
        <span>[H⁺] = {hPlus.toExponential(2)}</span>
        <span>[OH⁻] = {ohMinus.toExponential(2)}</span>
      </div>

      {inBufferRegion && (
        <div className="text-xs mt-1 p-2 rounded" style={{ background: '#22c55e11', color: '#16a34a' }}>
          Henderson–Hasselbalch: pH = pKa + log([A⁻]/[HA])
        </div>
      )}
    </div>
  )
}
