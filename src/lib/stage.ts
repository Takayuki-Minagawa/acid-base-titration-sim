import type { SimState } from '../context/SimContext'
import { getIndicator } from '../data/indicators'

export type TitrationType = 'strong_strong' | 'strong_weak' | 'weak_strong' | 'weak_weak'
export type Stage = 'start' | 'progress' | 'near' | 'after'

export const isWeakAcid = (s: Pick<SimState, 'acidId'>) => s.acidId === 'CH3COOH' || s.acidId === 'H3PO4'
export const isWeakBase = (s: Pick<SimState, 'baseId'>) => s.baseId === 'NH3'

export function titrationType(s: SimState): TitrationType {
  const wa = isWeakAcid(s)
  const wb = isWeakBase(s)
  if (!wa && !wb) return 'strong_strong'
  if (!wa && wb) return 'strong_weak'
  if (wa && !wb) return 'weak_strong'
  return 'weak_weak'
}

export function maxVolume(s: SimState): number {
  return s.curve[s.curve.length - 1]?.volume ?? s.equivVol * 2
}

/** Weak sample titrated with a strong titrant → buffer region & half-equivalence point exist */
export function hasBuffer(s: SimState): boolean {
  return s.acidInBeaker ? (isWeakAcid(s) && !isWeakBase(s)) : (isWeakBase(s) && !isWeakAcid(s))
}

export function isInBufferRegion(s: SimState): boolean {
  return hasBuffer(s) && s.addedVol > s.equivVol * 0.05 && s.addedVol < s.equivVol * 0.98
}

/** Same thresholds the explanation text uses */
export function titrationStage(s: SimState): Stage {
  if (s.addedVol < 0.01) return 'start'
  if (s.addedVol > s.equivVol * 1.1) return 'after'
  if (s.addedVol > s.equivVol * 0.7) return 'near'
  return 'progress'
}

/** Volume of one drop from the burette (mL) */
export const DROP_VOLUME = 0.05

/** Indicator colour-change range contains an equivalence-point pH */
export function indicatorSuitable(s: SimState): boolean {
  const ind = getIndicator(s.indicatorId)
  return s.indicatorId !== 'none' && s.equivalencePoints.some(ep => ep.ph >= ind.pHLow && ep.ph <= ind.pHHigh)
}

/** Decimal places for volume readouts, so tiny titrations (maxVol ≪ 1 mL) stay legible */
export function volDecimals(maxVol: number): number {
  if (maxVol >= 50) return 0
  if (maxVol >= 5) return 1
  if (maxVol >= 0.5) return 2
  return 3
}

/** Seek-slider step: one drop, but never coarser than 1/200 of the full range */
export function seekStep(maxVol: number): number {
  return Math.min(DROP_VOLUME, maxVol / 200)
}
