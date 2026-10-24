import { useMemo, useState, useCallback, useId, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { getIndicator } from '../data/indicators'
import type { TitrationPoint } from '../lib/titration'
import { PH_STOPS, phColor } from '../lib/phColor'
import { hasBuffer, indicatorSuitable, maxVolume } from '../lib/stage'
import { ChartIcon, CheckIcon, DownloadIcon, XIcon } from './Icons'

const MARGIN = { top: 18, right: 54, bottom: 44, left: 44 }
const W = 520
const H = 300
const PLOT_W = W - MARGIN.left - MARGIN.right
const PLOT_H = H - MARGIN.top - MARGIN.bottom

export default function TitrationCurve() {
  const { t } = useTranslation()
  const { state } = useSim()
  // Store only the hovered volume; the point is looked up in the current curve, so a config change never shows stale values
  const [hoverVol, setHoverVol] = useState<number | null>(null)
  const uid = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)

  // Touch: the tooltip stays after the finger lifts; a tap elsewhere dismisses it
  const hasHover = hoverVol !== null
  useEffect(() => {
    if (!hasHover) return
    const onDown = (e: PointerEvent) => {
      if (svgRef.current && !svgRef.current.contains(e.target as Node)) setHoverVol(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [hasHover])

  const { curve, addedVol, equivalencePoints, indicatorId } = state
  const indicator = getIndicator(indicatorId)

  const maxX = maxVolume(state)

  const toSvgX = useCallback((v: number) => MARGIN.left + (v / maxX) * PLOT_W, [maxX])
  const toSvgY = useCallback((ph: number) => MARGIN.top + PLOT_H - (ph / 14) * PLOT_H, [])

  // Build path for completed portion
  const drawnPoints = useMemo(
    () => curve.filter(p => p.volume <= addedVol),
    [curve, addedVol],
  )

  const pathD = useMemo(() => {
    if (drawnPoints.length < 2) return ''
    return drawnPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(p.volume).toFixed(1)},${toSvgY(p.ph).toFixed(1)}`)
      .join(' ')
  }, [drawnPoints, toSvgX, toSvgY])

  const areaD = useMemo(() => {
    if (!pathD) return ''
    const last = drawnPoints[drawnPoints.length - 1]
    return `${pathD} L${toSvgX(last.volume).toFixed(1)},${MARGIN.top + PLOT_H} L${MARGIN.left},${MARGIN.top + PLOT_H} Z`
  }, [pathD, drawnPoints, toSvgX])

  // Ghost full curve (dimmed)
  const ghostD = useMemo(() => {
    if (curve.length < 2) return ''
    return curve
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(p.volume).toFixed(1)},${toSvgY(p.ph).toFixed(1)}`)
      .join(' ')
  }, [curve, toSvgX, toSvgY])

  // y-axis ticks
  const yTicks = [0, 2, 4, 6, 7, 8, 10, 12, 14]
  const xTicks = useMemo(() => {
    const count = 5
    return Array.from({ length: count + 1 }, (_, i) => parseFloat(((i / count) * maxX).toFixed(1)))
  }, [maxX])

  // Indicator band
  const indBandY1 = toSvgY(indicator.pHHigh)
  const indBandY2 = toSvgY(indicator.pHLow)

  // Suitability
  const suitable = indicatorSuitable(state)

  // Half-equivalence point (pH ≈ pKa for weak acid / 14 − pKb for weak base)
  const buffer = hasBuffer(state)
  const halfEq = useMemo(() => {
    if (!buffer) return null
    const v = state.equivVol / 2
    let best: TitrationPoint | null = null
    for (const p of curve) if (!best || Math.abs(p.volume - v) < Math.abs(best.volume - v)) best = p
    return best
  }, [buffer, curve, state.equivVol])

  // Hover / touch handler
  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = (e.clientX - rect.left) / (rect.width / W)
    const xVol = ((svgX - MARGIN.left) / PLOT_W) * maxX
    if (xVol < 0 || xVol > maxX) { setHoverVol(null); return }
    // Find nearest drawn point
    let nearest: TitrationPoint | null = null
    let minDist = Infinity
    for (const p of drawnPoints) {
      const d = Math.abs(p.volume - xVol)
      if (d < minDist) { minDist = d; nearest = p }
    }
    setHoverVol(nearest ? nearest.volume : null)
  }

  const handleExportCsv = () => {
    const rows = [
      ['volume_mL', 'pH'],
      ...state.curve
        .filter(p => p.volume <= state.addedVol + 0.001)
        .map(p => [p.volume.toFixed(2), p.ph.toFixed(4)]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `titration_${state.acidId}_${state.baseId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cur = { x: toSvgX(addedVol), y: toSvgY(state.currentPH) }

  // Tooltip placement, kept inside the plot
  const shownPoint = hoverVol === null ? null : drawnPoints.find(p => p.volume === hoverVol) ?? null
  const tip = shownPoint && (() => {
    const hx = toSvgX(shownPoint.volume)
    const hy = toSvgY(shownPoint.ph)
    const tw = 96, th = 36
    const tx = hx + 10 + tw > W - 4 ? hx - 10 - tw : hx + 10
    const ty = Math.max(MARGIN.top, Math.min(MARGIN.top + PLOT_H - th, hy - th - 6))
    return { hx, hy, tx, ty, tw, th }
  })()

  return (
    <div className="card flex flex-col h-full p-3 sm:p-4" style={{ color: 'var(--color-text)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h2 className="card-title m-0">
          <span className="card-title-icon"><ChartIcon size={16} /></span>
          {t('graph.title')}
        </h2>
        <div className="flex items-center gap-2">
          {indicatorId !== 'none' && (
            <span className={`chip ${suitable ? 'chip-success' : 'chip-danger'}`} key={`${indicatorId}-${suitable}`}>
              <span className="anim-pop inline-flex">{suitable ? <CheckIcon size={13} strokeWidth={3} /> : <XIcon size={13} strokeWidth={3} />}</span>
              {t(indicator.nameKey)} : {suitable ? t('graph.suitable') : t('graph.unsuitable')}
            </span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleExportCsv}
            disabled={state.addedVol < 0.01}
            aria-label={t('graph.exportAria')}
            title={t('graph.exportAria')}
          >
            <DownloadIcon size={14} /> CSV
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full flex-1 select-none"
        style={{ overflow: 'visible', touchAction: 'pan-y', minHeight: 200 }}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        ref={svgRef}
        onPointerLeave={e => { if (e.pointerType === 'mouse') setHoverVol(null) }}
        role="img"
        aria-label={t('graph.ariaLabel')}
      >
        <defs>
          {/* pH-coloured stroke: gradient mapped to the y axis (pH 0 → 14) */}
          <linearGradient id={`ph-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1={toSvgY(0)} x2="0" y2={toSvgY(14)}>
            {PH_STOPS.map(([p, c]) => <stop key={p} offset={p / 14} stopColor={c} />)}
          </linearGradient>
          <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.14" />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Indicator band */}
        {indicatorId !== 'none' && (
          <g>
            <rect
              x={MARGIN.left}
              y={indBandY1}
              width={PLOT_W}
              height={indBandY2 - indBandY1}
              fill={indicator.colorBase}
              opacity={0.16}
              style={{ transition: 'y 0.4s ease, height 0.4s ease' }}
            />
            <text x={MARGIN.left + 6} y={indBandY1 - 4} fontSize={10.5} fontWeight={600} fill="currentColor" opacity={0.65}>
              {t(indicator.nameKey)} {indicator.pHLow}–{indicator.pHHigh}
            </text>
          </g>
        )}

        {/* Grid lines */}
        {yTicks.map(ph => (
          <line
            key={ph}
            x1={MARGIN.left} y1={toSvgY(ph)}
            x2={MARGIN.left + PLOT_W} y2={toSvgY(ph)}
            stroke="currentColor" strokeOpacity={ph === 7 ? 0.22 : 0.08} strokeWidth={ph === 7 ? 1.2 : 0.8}
            strokeDasharray={ph === 7 ? '4,4' : undefined}
          />
        ))}

        {/* Region labels on the right */}
        <g fontSize={10.5} fontWeight={700} textAnchor="start">
          <text x={MARGIN.left + PLOT_W + 8} y={toSvgY(11)} fill="var(--color-base)">{t('region.basic')}</text>
          <text x={MARGIN.left + PLOT_W + 8} y={toSvgY(7) + 4} fill="var(--color-success)">{t('region.neutral')}</text>
          <text x={MARGIN.left + PLOT_W + 8} y={toSvgY(3)} fill="var(--color-acid)">{t('region.acidic')}</text>
        </g>

        {/* Ghost curve */}
        {ghostD && (
          <path d={ghostD} fill="none" stroke="currentColor" strokeOpacity={0.16} strokeWidth={1.5} strokeDasharray="3,4" />
        )}

        {/* Live curve */}
        {areaD && <path d={areaD} fill={`url(#area-${uid})`} />}
        {pathD && (
          <path d={pathD} fill="none" stroke={`url(#ph-${uid})`} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Half-equivalence marker */}
        {halfEq && (
          <g opacity={halfEq.volume <= addedVol ? 1 : 0.35} style={{ transition: 'opacity 0.3s' }}>
            <circle cx={toSvgX(halfEq.volume)} cy={toSvgY(halfEq.ph)} r={4} fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth={2} />
            <text x={toSvgX(halfEq.volume) - 6} y={toSvgY(halfEq.ph) - 9} fontSize={10.5} fontWeight={600} textAnchor="end" fill="var(--color-accent)">
              {t('graph.halfEquivalence')} pH={halfEq.ph.toFixed(2)}
            </text>
          </g>
        )}

        {/* Equivalence point markers */}
        {equivalencePoints.map((ep, i) => {
          const ex = toSvgX(ep.volume)
          const ey = toSvgY(ep.ph)
          const drawn = ep.volume <= addedVol
          return (
            <g key={i} opacity={drawn ? 1 : 0.35} style={{ transition: 'opacity 0.3s' }}>
              <line x1={ex} y1={MARGIN.top} x2={ex} y2={MARGIN.top + PLOT_H} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
              {drawn && <circle cx={ex} cy={ey} r={6} fill="none" stroke="#f59e0b" strokeWidth={2} className="pulse-ring" />}
              <circle cx={ex} cy={ey} r={5} fill="#f59e0b" stroke="var(--color-surface)" strokeWidth={1.5} />
              <text x={ex + 8} y={ey + 14} fontSize={10.5} fontWeight={700} fill="var(--color-warn)">
                {t('graph.equivalencePoint')} pH={ep.ph.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Current position */}
        {drawnPoints.length > 0 && (
          <g>
            <circle cx={cur.x} cy={cur.y} r={10} fill={phColor(state.currentPH)} opacity={0.22} />
            <circle cx={cur.x} cy={cur.y} r={5.5} fill={phColor(state.currentPH)} stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        )}

        {/* Hover tooltip */}
        {shownPoint && tip && (
          <g pointerEvents="none">
            <line
              x1={tip.hx} y1={MARGIN.top}
              x2={tip.hx} y2={MARGIN.top + PLOT_H}
              stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3,2"
            />
            <circle cx={tip.hx} cy={tip.hy} r={4} fill={phColor(shownPoint.ph)} stroke="var(--color-surface)" strokeWidth={1.5} />
            <rect
              x={tip.tx} y={tip.ty}
              width={tip.tw} height={tip.th} rx={8}
              fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth={1}
              style={{ filter: 'drop-shadow(0 4px 8px rgba(15,23,42,0.15))' }}
            />
            <text x={tip.tx + 10} y={tip.ty + 15} fontSize={10.5} fill="currentColor" opacity={0.7}>
              {shownPoint.volume.toFixed(2)} mL
            </text>
            <text x={tip.tx + 10} y={tip.ty + 29} fontSize={12} fontWeight={700} fill="currentColor">
              pH = {shownPoint.ph.toFixed(2)}
            </text>
          </g>
        )}

        {/* Y axis */}
        <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + PLOT_H} stroke="currentColor" strokeOpacity={0.35} />
        {yTicks.map(ph => (
          <g key={ph}>
            <line x1={MARGIN.left - 4} y1={toSvgY(ph)} x2={MARGIN.left} y2={toSvgY(ph)} stroke="currentColor" strokeOpacity={0.35} />
            <text x={MARGIN.left - 7} y={toSvgY(ph) + 4} fontSize={11} textAnchor="end" fill="currentColor" opacity={0.6} className="tabular">{ph}</text>
          </g>
        ))}
        <text
          x={12} y={MARGIN.top + PLOT_H / 2}
          fontSize={11.5} fontWeight={600} fill="currentColor" opacity={0.6}
          textAnchor="middle"
          transform={`rotate(-90, 12, ${MARGIN.top + PLOT_H / 2})`}
        >
          {t('graph.yLabel')}
        </text>

        {/* X axis */}
        <line x1={MARGIN.left} y1={MARGIN.top + PLOT_H} x2={MARGIN.left + PLOT_W} y2={MARGIN.top + PLOT_H} stroke="currentColor" strokeOpacity={0.35} />
        {xTicks.map(v => (
          <g key={v}>
            <line x1={toSvgX(v)} y1={MARGIN.top + PLOT_H} x2={toSvgX(v)} y2={MARGIN.top + PLOT_H + 4} stroke="currentColor" strokeOpacity={0.35} />
            <text x={toSvgX(v)} y={MARGIN.top + PLOT_H + 16} fontSize={11} textAnchor="middle" fill="currentColor" opacity={0.6} className="tabular">{v}</text>
          </g>
        ))}
        <text x={MARGIN.left + PLOT_W / 2} y={H - 4} fontSize={11.5} fontWeight={600} textAnchor="middle" fill="currentColor" opacity={0.6}>
          {t('graph.xLabel')}
        </text>
      </svg>
      <p className="text-[11px] m-0 mt-1 text-center" style={{ color: 'var(--color-text-muted)' }}>{t('graph.tapHint')}</p>
    </div>
  )
}
