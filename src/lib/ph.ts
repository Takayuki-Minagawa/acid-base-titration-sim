/**
 * pH calculation library (textbook approximation)
 * Covers: strong acid, strong base, weak acid, weak base, mixtures.
 */

const KW = 1.0e-14
const EPS = 1e-10 // floating-point equivalence threshold

export function computePH(
  acidMol: number,
  baseMol: number,
  totalVol: number,
  pKaValues: number[],
  acidStrong: boolean,
  baseStrong: boolean,
  pKb = 4.74,
): number {
  const Ka = Math.pow(10, -pKaValues[0])
  const Kb = Math.pow(10, -pKb)

  const netAcid = acidMol - baseMol
  const C = Math.abs(netAcid) / totalVol

  // At or very near equivalence
  if (Math.abs(netAcid) < EPS * Math.max(acidMol, baseMol, 1e-6)) {
    if (acidStrong && baseStrong) {
      return 7.0
    } else if (!acidStrong && baseStrong) {
      // Conjugate base (A⁻) hydrolysis: pH > 7
      const Kb_conj = KW / Ka
      const concSalt = Math.max(acidMol, baseMol) / totalVol
      const oh = Math.sqrt(Kb_conj * concSalt)
      return 14 + Math.log10(Math.max(oh, 1e-15))
    } else if (acidStrong && !baseStrong) {
      // Conjugate acid (BH⁺) hydrolysis: pH < 7
      const Ka_conj = KW / Kb
      const concSalt = Math.max(acidMol, baseMol) / totalVol
      const h = Math.sqrt(Ka_conj * concSalt)
      return -Math.log10(Math.max(h, 1e-15))
    } else {
      // Weak–weak: pH ≈ 7 + ½(pKa − pKb) from textbook
      return 7 + 0.5 * (Math.log10(Kb) - Math.log10(Ka))
    }
  }

  if (netAcid > 0) {
    // Excess acid side
    if (acidStrong) {
      return -Math.log10(Math.max(C, 1e-15))
    } else {
      // Weak acid region
      const molConj = baseMol
      const molHA = netAcid
      if (baseStrong && molConj > EPS) {
        // Buffer: Henderson–Hasselbalch
        return pKaValues[0] + Math.log10(molConj / molHA)
      }
      // Pure weak acid
      return -Math.log10(Math.max(solveWeakAcid(Ka, C), 1e-15))
    }
  } else {
    // Excess base side
    if (baseStrong) {
      return 14 + Math.log10(Math.max(C, 1e-15))
    } else {
      // Weak base region (acid in beaker titrated by weak base, or reverse)
      if (acidStrong) {
        // Buffer: weak base + conjugate acid (NH₄⁺/NH₃ type)
        const molB = Math.abs(netAcid)     // excess weak base
        const molBH = baseMol - molB       // conjugate acid formed
        if (molBH > EPS) {
          const pKa_conj = 14 - pKb
          return pKa_conj + Math.log10(molB / molBH)
        }
      }
      // Pure weak base
      const oh = solveWeakBase(Kb, C)
      return 14 + Math.log10(Math.max(oh, 1e-15))
    }
  }
}

function solveWeakAcid(Ka: number, C: number): number {
  // Ka = x²/(C−x) → x² + Ka·x − Ka·C = 0
  return (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * C)) / 2
}

function solveWeakBase(Kb: number, C: number): number {
  return (-Kb + Math.sqrt(Kb * Kb + 4 * Kb * C)) / 2
}

export function clampPH(ph: number): number {
  return Math.max(0, Math.min(14, isFinite(ph) ? ph : 7))
}

export function ionConcentrations(ph: number): { hPlus: number; ohMinus: number } {
  const hPlus = Math.pow(10, -ph)
  const ohMinus = KW / hPlus
  return { hPlus, ohMinus }
}
