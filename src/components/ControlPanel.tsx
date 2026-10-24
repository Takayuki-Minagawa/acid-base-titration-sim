import { useId, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { ACIDS, getAcid } from '../data/acids'
import type { AcidId } from '../data/acids'
import { BASES, getBase } from '../data/bases'
import type { BaseId } from '../data/bases'
import { INDICATORS } from '../data/indicators'
import type { Indicator } from '../data/indicators'
import { DropIcon, FlaskIcon, PaletteIcon, SwapIcon } from './Icons'

export default function ControlPanel() {
  const { t } = useTranslation()
  const { state, dispatch } = useSim()

  const acidSelect = (id: string) => (
    <select id={id} className="select" value={state.acidId} onChange={e => dispatch({ type: 'SET_ACID', id: e.target.value as AcidId })}>
      {ACIDS.map(a => <option key={a.id} value={a.id}>{t(a.nameKey)}</option>)}
    </select>
  )
  const baseSelect = (id: string) => (
    <select id={id} className="select" value={state.baseId} onChange={e => dispatch({ type: 'SET_BASE', id: e.target.value as BaseId })}>
      {BASES.map(b => <option key={b.id} value={b.id}>{t(b.nameKey)}</option>)}
    </select>
  )

  const acid = getAcid(state.acidId)
  const base = getBase(state.baseId)
  const acidTag = <StrengthTag strong={acid.strong} label={t(acid.strong ? 'controls.strength.strongAcid' : 'controls.strength.weakAcid')} kind="acid" />
  const baseTag = <StrengthTag strong={base.strong} label={t(base.strong ? 'controls.strength.strongBase' : 'controls.strength.weakBase')} kind="base" />

  return (
    <aside className="card flex flex-col gap-4 p-4 h-full" aria-labelledby="controls-title">
      <h2 id="controls-title" className="card-title m-0">
        <span className="card-title-icon"><FlaskIcon size={16} /></span>
        {t('controls.title')}
      </h2>

      {/* Direction toggle: acid→base or base→acid */}
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow flex items-center gap-1"><SwapIcon size={12} /> {t('controls.direction')}</span>
        <div className="segmented" role="group" aria-label={t('controls.direction')}>
          <button aria-pressed={state.acidInBeaker} onClick={() => dispatch({ type: 'SET_ACID_IN_BEAKER', v: true })}>
            {t('controls.acid')} → {t('controls.base')}
          </button>
          <button aria-pressed={!state.acidInBeaker} onClick={() => dispatch({ type: 'SET_ACID_IN_BEAKER', v: false })}>
            {t('controls.base')} → {t('controls.acid')}
          </button>
        </div>
      </div>

      {/* Titrant (burette) */}
      <SpeciesCard
        icon={<BuretteGlyph />}
        title={t('controls.titrantCard')}
        tag={state.acidInBeaker ? baseTag : acidTag}
        renderSelect={id => (state.acidInBeaker ? baseSelect(id) : acidSelect(id))}
        selectLabel={`${t('controls.titrant')} (${state.acidInBeaker ? t('controls.base') : t('controls.acid')})`}
      >
        <SliderRow
          label={t('controls.titrantConc')}
          display={`${state.titrantConc.toFixed(3)}`}
          min={0.001} max={1} step={0.001} value={state.titrantConc}
          onChange={v => dispatch({ type: 'SET_TITRANT_CONC', v })}
        />
      </SpeciesCard>

      {/* Sample (beaker) */}
      <SpeciesCard
        icon={<BeakerGlyph />}
        title={t('controls.sampleCard')}
        tag={state.acidInBeaker ? acidTag : baseTag}
        renderSelect={id => (state.acidInBeaker ? acidSelect(id) : baseSelect(id))}
        selectLabel={`${t('controls.sample')} (${state.acidInBeaker ? t('controls.acid') : t('controls.base')})`}
      >
        <SliderRow
          label={t('controls.concentration')}
          display={`${state.sampleConc.toFixed(3)}`}
          min={0.001} max={1} step={0.001} value={state.sampleConc}
          onChange={v => dispatch({ type: 'SET_SAMPLE_CONC', v })}
        />
        <SliderRow
          label={t('controls.volume')}
          display={`${state.sampleVol.toFixed(0)} mL`}
          min={10} max={100} step={1} value={state.sampleVol}
          onChange={v => dispatch({ type: 'SET_SAMPLE_VOL', v })}
        />
      </SpeciesCard>

      {/* Indicator */}
      <fieldset className="flex flex-col gap-1.5 border-0 p-0 m-0 min-w-0">
        <legend className="eyebrow flex items-center gap-1 mb-1.5 p-0"><PaletteIcon size={12} /> {t('controls.indicator')}</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {INDICATORS.map(ind => (
            <IndicatorOption
              key={ind.id}
              indicator={ind}
              selected={state.indicatorId === ind.id}
              onSelect={() => dispatch({ type: 'SET_INDICATOR', id: ind.id })}
            />
          ))}
        </div>
      </fieldset>

      {/* Drop speed */}
      <SliderRow
        label={t('controls.dropSpeed')}
        icon={<DropIcon size={12} />}
        display={`${state.dropSpeed.toFixed(1)}`}
        min={0.1} max={5} step={0.1} value={state.dropSpeed}
        onChange={v => dispatch({ type: 'SET_DROP_SPEED', v })}
        hints={[t('controls.slow'), t('controls.fast')]}
      />
    </aside>
  )
}

function SpeciesCard({
  icon, title, tag, renderSelect, selectLabel, children,
}: {
  icon: ReactNode
  title: string
  tag: ReactNode
  renderSelect: (id: string) => ReactNode
  selectLabel: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl p-3 border" style={{ background: 'var(--color-surface2)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>
          {icon}{title}
        </span>
        {tag}
      </div>
      <label htmlFor={id} className="sr-only">{selectLabel}</label>
      {renderSelect(id)}
      {children}
    </div>
  )
}

function StrengthTag({ strong, label, kind }: { strong: boolean; label: string; kind: 'acid' | 'base' }) {
  const color = kind === 'acid' ? 'var(--color-acid)' : 'var(--color-base)'
  return (
    <span
      className="chip"
      style={{
        background: `color-mix(in srgb, ${color} ${strong ? 12 : 6}%, transparent)`,
        color,
        border: strong ? '1px solid transparent' : `1px dashed color-mix(in srgb, ${color} 55%, transparent)`,
      }}
    >
      {label}
    </span>
  )
}

function IndicatorOption({ indicator, selected, onSelect }: { indicator: Indicator; selected: boolean; onSelect: () => void }) {
  const { t } = useTranslation()
  const none = indicator.id === 'none'
  const isClear = (c: string) => c === 'transparent' || /^#[0-9a-f]{6}00$/i.test(c)
  const swatch = (c: string) => (isClear(c)
    ? 'repeating-linear-gradient(45deg, var(--color-surface3) 0 3px, var(--color-surface) 3px 6px)'
    : c)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex flex-col items-start gap-1 rounded-xl p-2 text-left cursor-pointer"
      style={{
        border: `1.5px solid ${selected ? 'var(--color-accent)' : 'var(--color-border)'}`,
        background: selected ? 'var(--color-accent-soft)' : 'var(--color-surface)',
        color: 'var(--color-text)',
        transition: 'border-color 0.2s, background-color 0.2s, transform 0.12s',
        font: 'inherit',
      }}
    >
      <span className="flex w-full h-3 rounded-full overflow-hidden" aria-hidden="true" style={{ border: '1px solid var(--color-border)' }}>
        {none ? (
          <span className="flex-1" style={{ background: swatch('transparent') }} />
        ) : (
          <>
            <span className="flex-1" style={{ background: swatch(indicator.colorAcid) }} />
            <span className="flex-1" style={{ background: `linear-gradient(90deg, ${isClear(indicator.colorAcid) ? 'transparent' : indicator.colorAcid}, ${indicator.colorBase})` }} />
            <span className="flex-1" style={{ background: swatch(indicator.colorBase) }} />
          </>
        )}
      </span>
      <span className="text-[12px] font-semibold leading-tight">{t(indicator.nameKey)}</span>
      <span className="mono text-[10.5px]" style={{ color: 'var(--color-text-muted)' }}>
        {none ? '—' : `pH ${indicator.pHLow}–${indicator.pHHigh}`}
      </span>
    </button>
  )
}

function SliderRow({
  label, display, min, max, step, value, onChange, hints, icon,
}: {
  label: string
  display: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  hints?: [string, string]
  icon?: ReactNode
}) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>{icon}{label}</label>
        <span className="mono text-[13px] font-bold" style={{ color: 'var(--color-text)' }}>{display}</span>
      </div>
      <input
        id={id}
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="range"
        style={{ '--fill': `${pct}%` } as CSSProperties}
      />
      {hints && (
        <div className="flex justify-between text-[10.5px]" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true">
          <span>{hints[0]}</span><span>{hints[1]}</span>
        </div>
      )}
    </div>
  )
}

function BuretteGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
      <path d="M10 2h4v13l-1 2v3h-2v-3l-1-2V2Z" />
      <path d="M14 6h2M14 10h2" />
    </svg>
  )
}

function BeakerGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: 'var(--color-accent)' }}>
      <path d="M4 4h16M6 4v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4" />
      <path d="M6 13h12" />
    </svg>
  )
}
