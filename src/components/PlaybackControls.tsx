import { useId, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { DROP_VOLUME, maxVolume } from '../lib/stage'
import { DropIcon, PauseIcon, PlayIcon, ResetIcon } from './Icons'

/** Play / pause, single drop, reset — shared by the experiment panel and the mobile dock */
export function PlaybackButtons({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const { state, dispatch } = useSim()
  const maxVol = maxVolume(state)
  const running = state.status === 'running'
  const done = state.status === 'done'

  const addDrop = () => {
    dispatch({ type: 'SEEK', vol: Math.min(maxVol, +(state.addedVol + DROP_VOLUME).toFixed(3)) })
  }

  return (
    <div className="flex items-center gap-2 flex-1">
      <button
        className={`btn ${running ? 'btn-pause' : 'btn-primary'} ${compact ? '' : 'flex-[1.4]'}`}
        style={compact ? { minWidth: 96 } : { minHeight: 44 }}
        onClick={() => dispatch({ type: running ? 'PAUSE' : 'PLAY' })}
        disabled={done}
      >
        {running ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        {running ? t('controls.pause') : t('controls.play')}
      </button>
      <button
        className="btn btn-ghost flex-1"
        style={compact ? undefined : { minHeight: 44 }}
        onClick={addDrop}
        disabled={running || state.addedVol >= maxVol}
        aria-label={t('controls.oneDropAria')}
        title={t('controls.oneDropAria')}
      >
        <DropIcon size={16} />
        {t('controls.oneDrop')}
      </button>
      <button
        className={`btn btn-ghost ${compact ? 'btn-icon' : 'flex-1 min-w-[44px]'}`}
        style={compact ? undefined : { minHeight: 44 }}
        onClick={() => dispatch({ type: 'RESET' })}
        aria-label={t('controls.reset')}
        title={t('controls.reset')}
      >
        <ResetIcon size={16} />
        {!compact && <span className="hidden min-[420px]:inline">{t('controls.reset')}</span>}
      </button>
    </div>
  )
}

/** Seek slider for the added volume, with equivalence-point ticks */
export function SeekSlider() {
  const { t } = useTranslation()
  const { state, dispatch } = useSim()
  const id = useId()
  const maxVol = maxVolume(state)
  const pct = (state.addedVol / maxVol) * 100

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {t('controls.added')}
        </label>
        <span className="mono text-sm font-bold" style={{ color: 'var(--color-text)' }}>
          {state.addedVol.toFixed(2)} <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>/ {maxVol.toFixed(1)} mL</span>
        </span>
      </div>
      <div className="relative">
        <input
          id={id}
          type="range"
          className="range"
          min={0}
          max={maxVol}
          step={DROP_VOLUME}
          value={state.addedVol}
          style={{ '--fill': `${pct}%` } as CSSProperties}
          onChange={e => dispatch({ type: 'SEEK', vol: parseFloat(e.target.value) })}
          aria-valuetext={`${state.addedVol.toFixed(2)} mL`}
        />
        {state.equivalencePoints.map((ep, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute pointer-events-none"
            title={t('graph.equivalencePoint')}
            style={{
              left: `calc(9px + (100% - 18px) * ${ep.volume / maxVol})`,
              top: 1,
              width: 2,
              height: 20,
              transform: 'translateX(-50%)',
              borderRadius: 2,
              background: '#f59e0b',
              opacity: 0.85,
            }}
          />
        ))}
      </div>
    </div>
  )
}
