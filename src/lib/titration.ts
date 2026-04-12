import { computePH, clampPH } from './ph'
import type { Acid } from '../data/acids'
import type { Base } from '../data/bases'

export interface TitrationPoint {
  volume: number // mL of titrant added
  ph: number
}

export interface EquivalencePoint {
  volume: number
  ph: number
}

export interface TitrationConfig {
  acid: Acid
  base: Base
  /** Whether acid is in beaker (true) or base is in beaker (true for base) */
  acidInBeaker: boolean
  sampleConc: number   // mol/L
  sampleVol: number    // mL
  titrantConc: number  // mol/L
}

/**
 * Build the full titration curve as an array of {volume, ph} points.
 * Step: 0.1 mL up to 2× the equivalence volume.
 */
export function buildCurve(cfg: TitrationConfig): TitrationPoint[] {
  const { sampleConc, sampleVol, titrantConc } = cfg

  const sampleMol = sampleConc * (sampleVol / 1000)
  const equivVol = sampleMol / titrantConc * 1000 // mL
  const maxVol = equivVol * 2.2

  const step = Math.max(0.05, maxVol / 500)
  const points: TitrationPoint[] = []

  for (let v = 0; v <= maxVol; v += step) {
    const ph = calcPH(cfg, v)
    points.push({ volume: parseFloat(v.toFixed(3)), ph: clampPH(ph) })
  }

  return points
}

export function calcPH(cfg: TitrationConfig, addedML: number): number {
  const { acid, base, sampleConc, sampleVol, titrantConc } = cfg
  const totalVolL = (sampleVol + addedML) / 1000
  const addedMol = titrantConc * (addedML / 1000)
  const sampleMol = sampleConc * (sampleVol / 1000)

  if (cfg.acidInBeaker) {
    // Acid in beaker, base added
    return computePH(
      sampleMol,
      addedMol,
      totalVolL,
      acid.pKa,
      acid.strong,
      base.strong,
      base.pKb ?? 4.74,
    )
  } else {
    // Base in beaker, acid added — invert perspective
    return computePH(
      addedMol,
      sampleMol,
      totalVolL,
      acid.pKa,
      acid.strong,
      base.strong,
      base.pKb ?? 4.74,
    )
  }
}

/**
 * Detect equivalence points by finding local maxima of |dpH/dV|.
 */
export function findEquivalencePoints(points: TitrationPoint[]): EquivalencePoint[] {
  if (points.length < 3) return []

  const dphDv: number[] = []
  for (let i = 1; i < points.length - 1; i++) {
    const dV = points[i + 1].volume - points[i - 1].volume
    const dPH = points[i + 1].ph - points[i - 1].ph
    dphDv.push(Math.abs(dPH / (dV || 0.001)))
  }

  const threshold = Math.max(...dphDv) * 0.5
  const peaks: EquivalencePoint[] = []

  for (let i = 1; i < dphDv.length - 1; i++) {
    if (dphDv[i] > threshold && dphDv[i] >= dphDv[i - 1] && dphDv[i] >= dphDv[i + 1]) {
      // Check it's actually a local max
      const isLocalMax = dphDv[i] === Math.max(...dphDv.slice(Math.max(0, i - 5), i + 6))
      if (isLocalMax) {
        peaks.push({ volume: points[i + 1].volume, ph: points[i + 1].ph })
      }
    }
  }

  return peaks
}

/** Volume at equivalence (theoretical) */
export function equivalenceVolume(cfg: TitrationConfig): number {
  const sampleMol = cfg.sampleConc * (cfg.sampleVol / 1000)
  return (sampleMol / cfg.titrantConc) * 1000
}
