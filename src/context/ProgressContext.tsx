import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSim } from './SimContext'
import { getIndicator } from '../data/indicators'
import { DISCOVERY_IDS, type DiscoveryId } from '../lib/discoveries'
import { hasBuffer, indicatorSuitable, isInBufferRegion, titrationType, type TitrationType } from '../lib/stage'


export interface Toast {
  key: number
  id: DiscoveryId
}

interface ProgressValue {
  unlocked: DiscoveryId[]
  typesSeen: TitrationType[]
  unlock: (id: DiscoveryId) => void
  toasts: Toast[]
  dismissToast: (key: number) => void
}

const STORAGE_KEY = 'titration-progress-v1'

function load(): { unlocked: DiscoveryId[]; typesSeen: TitrationType[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        unlocked: Array.isArray(p.unlocked) ? p.unlocked.filter((x: string) => (DISCOVERY_IDS as readonly string[]).includes(x)) : [],
        typesSeen: Array.isArray(p.typesSeen) ? p.typesSeen : [],
      }
    }
  } catch { /* storage unavailable */ }
  return { unlocked: [], typesSeen: [] }
}

function save(unlocked: DiscoveryId[], typesSeen: TitrationType[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked, typesSeen }))
  } catch { /* storage unavailable */ }
}

const ProgressContext = createContext<ProgressValue>({
  unlocked: [],
  typesSeen: [],
  unlock: () => {},
  toasts: [],
  dismissToast: () => {},
})

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { state } = useSim()
  const [initial] = useState(load)
  const [unlocked, setUnlocked] = useState<DiscoveryId[]>(initial.unlocked)
  const [typesSeen, setTypesSeen] = useState<TitrationType[]>(initial.typesSeen)
  const [toasts, setToasts] = useState<Toast[]>([])

  // Refs mirror state so checks stay synchronous (and StrictMode-safe)
  const unlockedRef = useRef(unlocked)
  const typesRef = useRef(typesSeen)
  const toastKey = useRef(0)

  const unlock = useCallback((id: DiscoveryId) => {
    if (unlockedRef.current.includes(id)) return
    unlockedRef.current = [...unlockedRef.current, id]
    setUnlocked(unlockedRef.current)
    save(unlockedRef.current, typesRef.current)
    toastKey.current += 1
    const key = toastKey.current
    setToasts(ts => [...ts, { key, id }].slice(-3)) // keep only what's on screen
  }, [])

  const markType = useCallback((type: TitrationType) => {
    if (typesRef.current.includes(type)) return
    typesRef.current = [...typesRef.current, type]
    setTypesSeen(typesRef.current)
    save(unlockedRef.current, typesRef.current)
  }, [])

  const dismissToast = useCallback((key: number) => {
    setToasts(ts => ts.filter(t => t.key !== key))
  }, [])

  // Track the pH range observed in the current run (for the colour-change discovery)
  const run = useRef({ curve: state.curve, indicator: state.indicatorId, min: state.currentPH, max: state.currentPH })

  useEffect(() => {
    const s = state
    const r = run.current
    if (r.curve !== s.curve || r.indicator !== s.indicatorId || s.addedVol < 0.01) {
      run.current = { curve: s.curve, indicator: s.indicatorId, min: s.currentPH, max: s.currentPH }
    } else {
      r.min = Math.min(r.min, s.currentPH)
      r.max = Math.max(r.max, s.currentPH)
    }

    if (s.addedVol >= 0.01) unlock('firstDrop')

    const passedEquiv = s.addedVol >= s.equivVol && s.addedVol > 0
    if (passedEquiv) {
      unlock('equivalence')
      markType(titrationType(s))
      if (typesRef.current.length >= 4) unlock('allTypes')
      if (!s.acidInBeaker) unlock('reverse')
      if (indicatorSuitable(s)) unlock('rightIndicator')
    }

    if (s.indicatorId !== 'none') {
      const ind = getIndicator(s.indicatorId)
      if (run.current.min < ind.pHLow && run.current.max > ind.pHHigh) unlock('colorChange')
    }

    if (isInBufferRegion(s)) unlock('buffer')

    if (
      hasBuffer(s) &&
      s.status !== 'running' &&
      Math.abs(s.addedVol - s.equivVol / 2) <= s.equivVol * 0.04
    ) {
      unlock('halfEquiv')
    }
  }, [state, unlock, markType])

  return (
    <ProgressContext.Provider value={{ unlocked, typesSeen, unlock, toasts, dismissToast }}>
      {children}
    </ProgressContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgress() {
  return useContext(ProgressContext)
}
