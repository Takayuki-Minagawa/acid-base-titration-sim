/**
 * Universal-indicator style colour scale for pH 0–14.
 * Used as the visual "signature" of the app (curve stroke, pH chips, scale bar).
 */
export const PH_STOPS: [number, string][] = [
  [0, '#dc2626'],
  [2, '#ea580c'],
  [4, '#f59e0b'],
  [6, '#eab308'],
  [7, '#22c55e'],
  [8, '#14b8a6'],
  [10, '#3b82f6'],
  [12, '#6366f1'],
  [14, '#9333ea'],
]

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function phColor(ph: number): string {
  const p = Math.max(0, Math.min(14, ph))
  for (let i = 1; i < PH_STOPS.length; i++) {
    const [p1, c1] = PH_STOPS[i - 1]
    const [p2, c2] = PH_STOPS[i]
    if (p <= p2) {
      const t = (p - p1) / (p2 - p1)
      const a = hexToRgb(c1)
      const b = hexToRgb(c2)
      const mix = a.map((v, k) => Math.round(v + (b[k] - v) * t))
      return `rgb(${mix[0]},${mix[1]},${mix[2]})`
    }
  }
  return PH_STOPS[PH_STOPS.length - 1][1]
}

/** CSS linear-gradient covering pH 0 → 14 left to right */
export const PH_GRADIENT_CSS = `linear-gradient(90deg, ${PH_STOPS.map(([p, c]) => `${c} ${(p / 14) * 100}%`).join(', ')})`

export type PHRegion = 'acidic' | 'neutral' | 'basic'

export function phRegion(ph: number): PHRegion {
  if (ph < 6.5) return 'acidic'
  if (ph > 7.5) return 'basic'
  return 'neutral'
}
