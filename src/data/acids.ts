export type AcidId = 'HCl' | 'H2SO4' | 'CH3COOH' | 'H3PO4'

export interface Acid {
  id: AcidId
  nameKey: string
  strong: boolean
  /** pKa values for each dissociation step */
  pKa: number[]
  /** Number of protons (valence) */
  valence: number
}

export const ACIDS: Acid[] = [
  { id: 'HCl', nameKey: 'acids.HCl', strong: true, pKa: [-7], valence: 1 },
  { id: 'H2SO4', nameKey: 'acids.H2SO4', strong: true, pKa: [-3, 1.99], valence: 2 },
  { id: 'CH3COOH', nameKey: 'acids.CH3COOH', strong: false, pKa: [4.76], valence: 1 },
  { id: 'H3PO4', nameKey: 'acids.H3PO4', strong: false, pKa: [2.15, 7.20, 12.35], valence: 1 },
]

export function getAcid(id: AcidId): Acid {
  return ACIDS.find(a => a.id === id)!
}
