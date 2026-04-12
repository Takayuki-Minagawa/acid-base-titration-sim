import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { getIndicator } from '../data/indicators'
import type { TitrationPoint } from '../lib/titration'

const MARGIN = { top: 24, right: 20, bottom: 48, left: 48 }

export default function TitrationCurve() {
  const { t } = useTranslation()
  const { state } = useSim()
  const [hoverPoint, setHoverPoint] = useState<TitrationPoint | null>(null)

  const { curve, addedVol, equivalencePoints, indicatorId } = state
  const indicator = getIndicator(indicatorId)

  const maxX = curve[curve.length - 1]?.volume ?? state.equivVol * 2

  // SVG viewport
  const W = 480
  const H = 280
  const plotW = W - MARGIN.left - MARGIN.right
  const plotH = H - MARGIN.top - MARGIN.bottom

  const toSvgX = (v: number) => MARGIN.left + (v / maxX) * plotW
  const toSvgY = (ph: number) => MARGIN.top + plotH - (ph / 14) * plotH

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
  }, [drawnPoints])

  // Ghost full curve (dimmed)
  const ghostD = useMemo(() => {
    if (curve.length < 2) return ''
    return curve
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${toSvgX(p.volume).toFixed(1)},${toSvgY(p.ph).toFixed(1)}`)
      .join(' ')
  }, [curve])

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
  const suitable = equivalencePoints.some(
    ep => ep.ph >= indicator.pHLow && ep.ph <= indicator.pHHigh,
  )

  // Hover handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = (e.clientX - rect.left) / (rect.width / W)
    const xVol = ((svgX - MARGIN.left) / plotW) * maxX
    if (xVol < 0 || xVol > maxX) { setHoverPoint(null); return }
    // Find nearest drawn point
    let nearest: TitrationPoint | null = null
    let minDist = Infinity
    for (const p of drawnPoints) {
      const d = Math.abs(p.volume - xVol)
      if (d < minDist) { minDist = d; nearest = p }
    }
    setHoverPoint(nearest)
  }

  return (
    <div
      className="flex flex-col h-full p-2"
      style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">{t('graph.title')}</span>
        {indicatorId !== 'none' && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{ background: suitable ? '#22c55e22' : '#ef444422', color: suitable ? '#16a34a' : '#dc2626' }}
          >
            {suitable ? `✓ ${t('graph.suitable')}` : `✗ ${t('graph.unsuitable')}`}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full flex-1"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverPoint(null)}
        style={{ overflow: 'visible' }}
      >
        {/* Indicator band */}
        {indicatorId !== 'none' && (
          <rect
            x={MARGIN.left}
            y={indBandY1}
            width={plotW}
            height={indBandY2 - indBandY1}
            fill={indicator.colorBase}
            opacity={0.18}
          />
        )}

        {/* Grid lines */}
        {yTicks.map(ph => (
          <line
            key={ph}
            x1={MARGIN.left} y1={toSvgY(ph)}
            x2={MARGIN.left + plotW} y2={toSvgY(ph)}
            stroke="currentColor" strokeOpacity={0.1} strokeWidth={ph === 7 ? 1.5 : 0.8}
          />
        ))}

        {/* Ghost curve */}
        {ghostD && (
          <path d={ghostD} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={1.5} />
        )}

        {/* Live curve */}
        {pathD && (
          <path d={pathD} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" />
        )}

        {/* Equivalence point markers */}
        {equivalencePoints.map((ep, i) => {
          const ex = toSvgX(ep.volume)
          const ey = toSvgY(ep.ph)
          const drawn = ep.volume <= addedVol
          return (
            <g key={i} opacity={drawn ? 1 : 0.3}>
              <line x1={ex} y1={MARGIN.top} x2={ex} y2={MARGIN.top + plotH} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4,3" />
              <circle cx={ex} cy={ey} r={5} fill="#f59e0b" />
              <text x={ex + 6} y={ey - 6} fontSize={9} fill="#f59e0b">
                {t('graph.equivalencePoint')} pH={ep.ph.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Current position */}
        {drawnPoints.length > 0 && (
          <circle
            cx={toSvgX(addedVol)}
            cy={toSvgY(state.currentPH)}
            r={5}
            fill="var(--color-accent)"
            stroke="white"
            strokeWidth={1.5}
          />
        )}

        {/* Hover tooltip */}
        {hoverPoint && (
          <g>
            <line
              x1={toSvgX(hoverPoint.volume)} y1={MARGIN.top}
              x2={toSvgX(hoverPoint.volume)} y2={MARGIN.top + plotH}
              stroke="currentColor" strokeOpacity={0.4} strokeWidth={1} strokeDasharray="3,2"
            />
            <circle cx={toSvgX(hoverPoint.volume)} cy={toSvgY(hoverPoint.ph)} r={4} fill="currentColor" />
            <rect
              x={toSvgX(hoverPoint.volume) + 8} y={toSvgY(hoverPoint.ph) - 22}
              width={90} height={28} rx={4}
              fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth={1}
            />
            <text x={toSvgX(hoverPoint.volume) + 13} y={toSvgY(hoverPoint.ph) - 10} fontSize={10} fill="currentColor">
              {hoverPoint.volume.toFixed(1)} mL
            </text>
            <text x={toSvgX(hoverPoint.volume) + 13} y={toSvgY(hoverPoint.ph) + 2} fontSize={10} fill="var(--color-accent)">
              pH = {hoverPoint.ph.toFixed(2)}
            </text>
          </g>
        )}

        {/* Y axis */}
        <line x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={MARGIN.top + plotH} stroke="currentColor" strokeOpacity={0.4} />
        {yTicks.map(ph => (
          <g key={ph}>
            <line x1={MARGIN.left - 4} y1={toSvgY(ph)} x2={MARGIN.left} y2={toSvgY(ph)} stroke="currentColor" strokeOpacity={0.4} />
            <text x={MARGIN.left - 6} y={toSvgY(ph) + 4} fontSize={10} textAnchor="end" fill="currentColor" opacity={0.6}>{ph}</text>
          </g>
        ))}
        <text
          x={12} y={MARGIN.top + plotH / 2}
          fontSize={11} fill="currentColor" opacity={0.6}
          textAnchor="middle"
          transform={`rotate(-90, 12, ${MARGIN.top + plotH / 2})`}
        >
          {t('graph.yLabel')}
        </text>

        {/* X axis */}
        <line x1={MARGIN.left} y1={MARGIN.top + plotH} x2={MARGIN.left + plotW} y2={MARGIN.top + plotH} stroke="currentColor" strokeOpacity={0.4} />
        {xTicks.map(v => (
          <g key={v}>
            <line x1={toSvgX(v)} y1={MARGIN.top + plotH} x2={toSvgX(v)} y2={MARGIN.top + plotH + 4} stroke="currentColor" strokeOpacity={0.4} />
            <text x={toSvgX(v)} y={MARGIN.top + plotH + 14} fontSize={10} textAnchor="middle" fill="currentColor" opacity={0.6}>{v}</text>
          </g>
        ))}
        <text x={MARGIN.left + plotW / 2} y={H - 4} fontSize={11} textAnchor="middle" fill="currentColor" opacity={0.6}>
          {t('graph.xLabel')}
        </text>

        {/* Indicator legend */}
        {indicatorId !== 'none' && (
          <g>
            <rect x={MARGIN.left + plotW - 120} y={MARGIN.top + 4} width={10} height={10} fill={indicator.colorBase} opacity={0.5} />
            <text x={MARGIN.left + plotW - 106} y={MARGIN.top + 13} fontSize={9} fill="currentColor" opacity={0.7}>
              {t(indicator.nameKey)} {indicator.pHLow}–{indicator.pHHigh}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
