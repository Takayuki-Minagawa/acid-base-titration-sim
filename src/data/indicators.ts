export type IndicatorId = 'none' | 'methylOrange' | 'btb' | 'phenolphthalein'

export interface Indicator {
  id: IndicatorId
  nameKey: string
  pHLow: number
  pHHigh: number
  colorAcid: string
  colorBase: string
}

export const INDICATORS: Indicator[] = [
  {
    id: 'none',
    nameKey: 'controls.none',
    pHLow: 0,
    pHHigh: 0,
    colorAcid: 'transparent',
    colorBase: 'transparent',
  },
  {
    id: 'methylOrange',
    nameKey: 'controls.methylOrange',
    pHLow: 3.1,
    pHHigh: 4.4,
    colorAcid: '#ef4444',   // red
    colorBase: '#f97316',   // orange
  },
  {
    id: 'btb',
    nameKey: 'controls.btb',
    pHLow: 6.0,
    pHHigh: 7.6,
    colorAcid: '#eab308',   // yellow
    colorBase: '#3b82f6',   // blue
  },
  {
    id: 'phenolphthalein',
    nameKey: 'controls.phenolphthalein',
    pHLow: 8.3,
    pHHigh: 10.0,
    colorAcid: '#d946ef00', // transparent magenta (colorless in acid)
    colorBase: '#d946ef',   // magenta
  },
]

export function getIndicator(id: IndicatorId): Indicator {
  return INDICATORS.find(i => i.id === id)!
}

/** Returns the solution color (CSS color string) for a given pH and indicator */
export function getSolutionColor(ph: number, indicator: Indicator): string {
  if (indicator.id === 'none') return 'rgba(200,230,255,0.5)'

  const { pHLow, pHHigh, colorAcid, colorBase } = indicator

  if (ph <= pHLow) return colorAcid
  if (ph >= pHHigh) return colorBase

  // Interpolate in transition range
  const t = (ph - pHLow) / (pHHigh - pHLow)
  return blendColors(colorAcid, colorBase, t)
}

function hexToRgba(hex: string): [number, number, number, number] | null {
  const m8 = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (m8) return [parseInt(m8[1], 16), parseInt(m8[2], 16), parseInt(m8[3], 16), parseInt(m8[4], 16) / 255]
  const m6 = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return m6 ? [parseInt(m6[1], 16), parseInt(m6[2], 16), parseInt(m6[3], 16), 1] : null
}

function blendColors(c1: string, c2: string, t: number): string {
  const r1 = hexToRgba(c1)
  const r2 = hexToRgba(c2)
  if (!r1 || !r2) return c2
  const r = Math.round(r1[0] + (r2[0] - r1[0]) * t)
  const g = Math.round(r1[1] + (r2[1] - r1[1]) * t)
  const b = Math.round(r1[2] + (r2[2] - r1[2]) * t)
  const a = +(r1[3] + (r2[3] - r1[3]) * t).toFixed(3)
  return `rgba(${r},${g},${b},${a})`
}
