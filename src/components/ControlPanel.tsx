import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { ACIDS } from '../data/acids'
import { BASES } from '../data/bases'
import { INDICATORS } from '../data/indicators'

export default function ControlPanel() {
  const { t } = useTranslation()
  const { state, dispatch } = useSim()

  const maxVol = state.curve[state.curve.length - 1]?.volume ?? state.equivVol * 2

  const sStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '13px',
    width: '100%',
  }

  return (
    <aside
      className="flex flex-col gap-3 p-3 overflow-y-auto"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
        {t('controls.title')}
      </h2>

      {/* Sample / Titrant toggle */}
      <div className="flex rounded overflow-hidden border text-xs" style={{ borderColor: 'var(--color-border)' }}>
        <button
          className="flex-1 py-1 transition-colors cursor-pointer"
          style={{
            background: state.acidInBeaker ? 'var(--color-accent)' : 'var(--color-surface2)',
            color: state.acidInBeaker ? '#fff' : 'var(--color-text)',
          }}
          onClick={() => dispatch({ type: 'SET_ACID_IN_BEAKER', v: true })}
        >
          {t('controls.acid')} → {t('controls.base')}
        </button>
        <button
          className="flex-1 py-1 transition-colors cursor-pointer"
          style={{
            background: !state.acidInBeaker ? 'var(--color-accent)' : 'var(--color-surface2)',
            color: !state.acidInBeaker ? '#fff' : 'var(--color-text)',
          }}
          onClick={() => dispatch({ type: 'SET_ACID_IN_BEAKER', v: false })}
        >
          {t('controls.base')} → {t('controls.acid')}
        </button>
      </div>

      {/* Sample species */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {t('controls.sample')} ({state.acidInBeaker ? t('controls.acid') : t('controls.base')})
        </label>
        {state.acidInBeaker ? (
          <select style={sStyle} value={state.acidId} onChange={e => dispatch({ type: 'SET_ACID', id: e.target.value as any })}>
            {ACIDS.map(a => <option key={a.id} value={a.id}>{t(a.nameKey)}</option>)}
          </select>
        ) : (
          <select style={sStyle} value={state.baseId} onChange={e => dispatch({ type: 'SET_BASE', id: e.target.value as any })}>
            {BASES.map(b => <option key={b.id} value={b.id}>{t(b.nameKey)}</option>)}
          </select>
        )}
      </div>

      {/* Titrant species */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {t('controls.titrant')} ({state.acidInBeaker ? t('controls.base') : t('controls.acid')})
        </label>
        {state.acidInBeaker ? (
          <select style={sStyle} value={state.baseId} onChange={e => dispatch({ type: 'SET_BASE', id: e.target.value as any })}>
            {BASES.map(b => <option key={b.id} value={b.id}>{t(b.nameKey)}</option>)}
          </select>
        ) : (
          <select style={sStyle} value={state.acidId} onChange={e => dispatch({ type: 'SET_ACID', id: e.target.value as any })}>
            {ACIDS.map(a => <option key={a.id} value={a.id}>{t(a.nameKey)}</option>)}
          </select>
        )}
      </div>

      {/* Concentration & Volume */}
      <SliderRow
        label={`${t('controls.concentration')}: ${state.sampleConc.toFixed(3)}`}
        min={0.001} max={1} step={0.001} value={state.sampleConc}
        onChange={v => dispatch({ type: 'SET_SAMPLE_CONC', v })}
      />
      <SliderRow
        label={`${t('controls.volume')}: ${state.sampleVol.toFixed(0)} mL`}
        min={10} max={100} step={1} value={state.sampleVol}
        onChange={v => dispatch({ type: 'SET_SAMPLE_VOL', v })}
      />
      <SliderRow
        label={`${t('controls.concentration')} (滴下液): ${state.titrantConc.toFixed(3)}`}
        min={0.001} max={1} step={0.001} value={state.titrantConc}
        onChange={v => dispatch({ type: 'SET_TITRANT_CONC', v })}
      />

      {/* Indicator */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {t('controls.indicator')}
        </label>
        <select style={sStyle} value={state.indicatorId} onChange={e => dispatch({ type: 'SET_INDICATOR', id: e.target.value as any })}>
          {INDICATORS.map(ind => <option key={ind.id} value={ind.id}>{t(ind.nameKey)}</option>)}
        </select>
      </div>

      {/* Drop speed */}
      <SliderRow
        label={`${t('controls.dropSpeed')}: ${state.dropSpeed.toFixed(1)}`}
        min={0.1} max={5} step={0.1} value={state.dropSpeed}
        onChange={v => dispatch({ type: 'SET_DROP_SPEED', v })}
      />

      {/* Playback */}
      <div className="flex gap-2">
        <button
          className="flex-1 py-2 rounded text-sm font-medium cursor-pointer transition-colors"
          style={{
            background: state.status === 'running' ? '#f97316' : 'var(--color-accent)',
            color: '#fff',
          }}
          onClick={() => dispatch({ type: state.status === 'running' ? 'PAUSE' : 'PLAY' })}
          disabled={state.status === 'done'}
        >
          {state.status === 'running' ? t('controls.pause') : t('controls.play')}
        </button>
        <button
          className="flex-1 py-2 rounded text-sm font-medium cursor-pointer"
          style={{ background: 'var(--color-surface2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          onClick={() => dispatch({ type: 'RESET' })}
        >
          {t('controls.reset')}
        </button>
      </div>

      {/* Seek slider */}
      <div className="flex flex-col gap-1">
        <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {t('controls.added')}: {state.addedVol.toFixed(2)} mL
        </label>
        <input
          type="range" min={0} max={maxVol} step={0.1}
          value={state.addedVol}
          onChange={e => dispatch({ type: 'SEEK', vol: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Status */}
      <div
        className="rounded px-3 py-2 text-center text-sm"
        style={{ background: 'var(--color-surface2)', color: 'var(--color-text)' }}
      >
        <div className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
          {t('controls.currentPH')}
        </div>
        <div className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
          {state.currentPH.toFixed(2)}
        </div>
      </div>
    </aside>
  )
}

function SliderRow({
  label, min, max, step, value, onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  )
}
