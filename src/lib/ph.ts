/**
 * pH calculation library (textbook approximation)
 * Covers: strong acid, strong base, weak acid, weak base, mixtures.
 */

const KW = 1.0e-14

/**
 * Compute pH given net moles of acid/base in a total volume (L).
 *
 * @param acidId   Acid identifier
 * @param acidMol  Moles of acid initially present (positive = acid)
 * @param baseMol  Moles of strong/weak base added
 * @param totalVol Total volume in liters
 * @param pKaValues Array of pKa values for the acid
 * @param acidStrong Is the acid strong?
 * @param baseStrong Is the base strong?
 * @param pKb pKb for weak base (if applicable)
 */
export function computePH(
  acidMol: number,
  baseMol: number,
  totalVol: number,
  pKaValues: number[],
  acidStrong: boolean,
  baseStrong: boolean,
  pKb = 4.74,
): number {
  // For simplicity, treat multi-protic as monoprotic for first equivalence
  // (textbook approximation)
  const Ka = Math.pow(10, -pKaValues[0])
  const Kb = Math.pow(10, -pKb)

  const netAcid = acidMol - baseMol // positive = excess acid, negative = excess base
  const C = Math.abs(netAcid) / totalVol // concentration of excess species

  if (netAcid === 0) {
    // Exactly at equivalence point
    if (acidStrong && baseStrong) {
      return 7.0
    } else if (!acidStrong && baseStrong) {
      // Conjugate base hydrolysis: pH > 7
      const Kb_conj = KW / Ka
      const concSalt = acidMol / totalVol
      const oh = Math.sqrt(Kb_conj * concSalt)
      return 14 + Math.log10(oh)
    } else if (acidStrong && !baseStrong) {
      // Conjugate acid hydrolysis: pH < 7
      const Ka_conj = KW / Kb
      const concSalt = baseMol / totalVol
      const h = Math.sqrt(Ka_conj * concSalt)
      return -Math.log10(h)
    } else {
      // Weak–weak: approximate
      return 7 + 0.5 * (Math.log10(Ka) - Math.log10(Kb))
    }
  }

  if (netAcid > 0) {
    // Excess acid side
    if (acidStrong) {
      // Strong acid: [H+] = C
      const h = Math.max(C, 1e-15)
      return -Math.log10(h)
    } else {
      // Weak acid: before equivalence — buffer region (Henderson–Hasselbalch)
      const molConjBase = baseMol
      const molWeakAcid = netAcid
      if (baseStrong && molConjBase > 0) {
        // Buffer: pH = pKa + log([A-]/[HA])
        return pKaValues[0] + Math.log10(molConjBase / molWeakAcid)
      }
      // Pure weak acid
      const h = solveWeakAcid(Ka, C)
      return -Math.log10(h)
    }
  } else {
    // Excess base side
    if (baseStrong) {
      // Strong base: [OH-] = C
      const oh = Math.max(C, 1e-15)
      return 14 + Math.log10(oh)
    } else {
      // Weak base: after equivalence
      if (acidStrong) {
        // Buffer: excess weak base + its conjugate acid
        const molWeakBase = Math.abs(netAcid)
        const molConjAcid = baseMol - molWeakBase
        if (molConjAcid > 0) {
          const pKa_conj = 14 - pKb
          return pKa_conj + Math.log10(molWeakBase / molConjAcid)
        }
        // Pure weak base
        const oh = solveWeakBase(Kb, C)
        return 14 + Math.log10(oh)
      }
      const oh = solveWeakBase(Kb, C)
      return 14 + Math.log10(oh)
    }
  }
}

function solveWeakAcid(Ka: number, C: number): number {
  // Ka = x² / (C - x)  →  x² + Ka*x - Ka*C = 0
  return (-Ka + Math.sqrt(Ka * Ka + 4 * Ka * C)) / 2
}

function solveWeakBase(Kb: number, C: number): number {
  return (-Kb + Math.sqrt(Kb * Kb + 4 * Kb * C)) / 2
}

/** Clamp pH to physically meaningful range */
export function clampPH(ph: number): number {
  return Math.max(0, Math.min(14, ph))
}

/** Compute ion concentrations at a given pH */
export function ionConcentrations(ph: number): {
  hPlus: number
  ohMinus: number
} {
  const hPlus = Math.pow(10, -ph)
  const ohMinus = KW / hPlus
  return { hPlus, ohMinus }
}
