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
    colorAcid: 'transparent',
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

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null
}

function blendColors(c1: string, c2: string, t: number): string {
  const r1 = hexToRgb(c1)
  const r2 = hexToRgb(c2)
  if (!r1 || !r2) return c2
  const r = Math.round(r1[0] + (r2[0] - r1[0]) * t)
  const g = Math.round(r1[1] + (r2[1] - r1[1]) * t)
  const b = Math.round(r1[2] + (r2[2] - r1[2]) * t)
  return `rgb(${r},${g},${b})`
}
