import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
  type Dispatch,
} from 'react'
import { type AcidId, getAcid } from '../data/acids'
import { type BaseId, getBase } from '../data/bases'
import type { IndicatorId } from '../data/indicators'
import { type TitrationPoint, type EquivalencePoint, buildCurve, calcPH, findEquivalencePoints, equivalenceVolume } from '../lib/titration'
import { clampPH, ionConcentrations } from '../lib/ph'

export interface SimState {
  // Config
  acidId: AcidId
  baseId: BaseId
  acidInBeaker: boolean
  sampleConc: number
  sampleVol: number
  titrantConc: number
  indicatorId: IndicatorId
  dropSpeed: number // mL/s

  // Simulation state
  status: 'idle' | 'running' | 'done'
  addedVol: number // mL added so far

  // Computed
  currentPH: number
  curve: TitrationPoint[]
  equivalencePoints: EquivalencePoint[]
  equivVol: number
  ions: { hPlus: number; ohMinus: number }
}

type Action =
  | { type: 'SET_ACID'; id: AcidId }
  | { type: 'SET_BASE'; id: BaseId }
  | { type: 'SET_ACID_IN_BEAKER'; v: boolean }
  | { type: 'SET_SAMPLE_CONC'; v: number }
  | { type: 'SET_SAMPLE_VOL'; v: number }
  | { type: 'SET_TITRANT_CONC'; v: number }
  | { type: 'SET_INDICATOR'; id: IndicatorId }
  | { type: 'SET_DROP_SPEED'; v: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'TICK'; dt: number }
  | { type: 'SEEK'; vol: number }

function makeInitialState(): SimState {
  const acidId: AcidId = 'HCl'
  const baseId: BaseId = 'NaOH'
  const sampleConc = 0.1
  const sampleVol = 50
  const titrantConc = 0.1
  const acidInBeaker = true

  const cfg = {
    acid: getAcid(acidId),
    base: getBase(baseId),
    acidInBeaker,
    sampleConc,
    sampleVol,
    titrantConc,
  }

  const curve = buildCurve(cfg)
  const equivVol = equivalenceVolume(cfg)
  const equivalencePoints = findEquivalencePoints(curve)
  const currentPH = clampPH(calcPH(cfg, 0))

  return {
    acidId,
    baseId,
    acidInBeaker,
    sampleConc,
    sampleVol,
    titrantConc,
    indicatorId: 'phenolphthalein',
    dropSpeed: 1,
    status: 'idle',
    addedVol: 0,
    currentPH,
    curve,
    equivalencePoints,
    equivVol,
    ions: ionConcentrations(currentPH),
  }
}

function recompute(state: SimState): SimState {
  const cfg = {
    acid: getAcid(state.acidId),
    base: getBase(state.baseId),
    acidInBeaker: state.acidInBeaker,
    sampleConc: state.sampleConc,
    sampleVol: state.sampleVol,
    titrantConc: state.titrantConc,
  }
  const curve = buildCurve(cfg)
  const equivVol = equivalenceVolume(cfg)
  const equivalencePoints = findEquivalencePoints(curve)
  const currentPH = clampPH(calcPH(cfg, state.addedVol))
  return {
    ...state,
    curve,
    equivVol,
    equivalencePoints,
    currentPH,
    ions: ionConcentrations(currentPH),
  }
}

function reducer(state: SimState, action: Action): SimState {
  switch (action.type) {
    case 'SET_ACID':
      return recompute({ ...state, acidId: action.id, addedVol: 0, status: 'idle' })
    case 'SET_BASE':
      return recompute({ ...state, baseId: action.id, addedVol: 0, status: 'idle' })
    case 'SET_ACID_IN_BEAKER':
      return recompute({ ...state, acidInBeaker: action.v, addedVol: 0, status: 'idle' })
    case 'SET_SAMPLE_CONC':
      return recompute({ ...state, sampleConc: action.v, addedVol: 0, status: 'idle' })
    case 'SET_SAMPLE_VOL':
      return recompute({ ...state, sampleVol: action.v, addedVol: 0, status: 'idle' })
    case 'SET_TITRANT_CONC':
      return recompute({ ...state, titrantConc: action.v, addedVol: 0, status: 'idle' })
    case 'SET_INDICATOR':
      return { ...state, indicatorId: action.id }
    case 'SET_DROP_SPEED':
      return { ...state, dropSpeed: action.v }
    case 'PLAY':
      if (state.status === 'done') return state
      return { ...state, status: 'running' }
    case 'PAUSE':
      return { ...state, status: 'idle' }
    case 'RESET': {
      const base = makeInitialState()
      return recompute({
        ...base,
        acidId: state.acidId,
        baseId: state.baseId,
        acidInBeaker: state.acidInBeaker,
        sampleConc: state.sampleConc,
        sampleVol: state.sampleVol,
        titrantConc: state.titrantConc,
        indicatorId: state.indicatorId,
        dropSpeed: state.dropSpeed,
        addedVol: 0,
        status: 'idle',
      })
    }
    case 'TICK': {
      if (state.status !== 'running') return state
      const maxVol = state.curve[state.curve.length - 1]?.volume ?? state.equivVol * 2
      const newVol = Math.min(state.addedVol + state.dropSpeed * action.dt, maxVol)
      const cfg = {
        acid: getAcid(state.acidId),
        base: getBase(state.baseId),
        acidInBeaker: state.acidInBeaker,
        sampleConc: state.sampleConc,
        sampleVol: state.sampleVol,
        titrantConc: state.titrantConc,
      }
      const currentPH = clampPH(calcPH(cfg, newVol))
      const done = newVol >= maxVol
      return {
        ...state,
        addedVol: newVol,
        currentPH,
        ions: ionConcentrations(currentPH),
        status: done ? 'done' : 'running',
      }
    }
    case 'SEEK': {
      const cfg = {
        acid: getAcid(state.acidId),
        base: getBase(state.baseId),
        acidInBeaker: state.acidInBeaker,
        sampleConc: state.sampleConc,
        sampleVol: state.sampleVol,
        titrantConc: state.titrantConc,
      }
      const currentPH = clampPH(calcPH(cfg, action.vol))
      return {
        ...state,
        addedVol: action.vol,
        currentPH,
        ions: ionConcentrations(currentPH),
        status: 'idle',
      }
    }
    default:
      return state
  }
}

interface SimContextValue {
  state: SimState
  dispatch: Dispatch<Action>
}

const SimContext = createContext<SimContextValue>({
  state: makeInitialState(),
  dispatch: () => {},
})

export function SimProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (state.status === 'running') {
      const loop = (now: number) => {
        if (lastTimeRef.current !== null) {
          const dt = (now - lastTimeRef.current) / 1000
          dispatch({ type: 'TICK', dt })
        }
        lastTimeRef.current = now
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
    } else {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTimeRef.current = null
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [state.status])

  return <SimContext.Provider value={{ state, dispatch }}>{children}</SimContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSim() {
  return useContext(SimContext)
}
