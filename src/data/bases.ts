export type BaseId = 'NaOH' | 'KOH' | 'NH3'

export interface Base {
  id: BaseId
  nameKey: string
  strong: boolean
  /** pKb for weak bases */
  pKb?: number
}

export const BASES: Base[] = [
  { id: 'NaOH', nameKey: 'bases.NaOH', strong: true },
  { id: 'KOH', nameKey: 'bases.KOH', strong: true },
  { id: 'NH3', nameKey: 'bases.NH3', strong: false, pKb: 4.74 },
]

export function getBase(id: BaseId): Base {
  return BASES.find(b => b.id === id)!
}
