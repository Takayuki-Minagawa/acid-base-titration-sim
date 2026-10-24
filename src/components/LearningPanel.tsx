import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { getIndicator } from '../data/indicators'
import { hasBuffer, indicatorSuitable, isWeakAcid, isWeakBase, titrationStage, titrationType, type Stage } from '../lib/stage'
import Quiz from './Quiz'
import { BookIcon, CheckIcon, FlaskIcon, LightbulbIcon, PaletteIcon, TargetIcon, TrophyIcon, WavesIcon, XIcon } from './Icons'

const TABS = ['explanation', 'quiz'] as const
type TabId = typeof TABS[number]

type CardKind = 'overview' | 'buffer' | 'equivalence' | 'near' | 'after' | 'indicator'

interface ExplanationCard {
  kind: CardKind
  text: string
  active?: boolean
}

const CARD_STYLE: Record<CardKind, { icon: ReactNode; color: string }> = {
  overview:    { icon: <FlaskIcon size={14} />,     color: 'var(--color-accent)' },
  buffer:      { icon: <WavesIcon size={14} />,     color: 'var(--color-success)' },
  equivalence: { icon: <TargetIcon size={14} />,    color: 'var(--color-warn)' },
  near:        { icon: <LightbulbIcon size={14} />, color: 'var(--color-warn)' },
  after:       { icon: <TargetIcon size={14} />,    color: 'var(--color-violet)' },
  indicator:   { icon: <PaletteIcon size={14} />,   color: 'var(--color-pink)' },
}

export default function LearningPanel() {
  const { t } = useTranslation()
  const { state } = useSim()
  const [tab, setTab] = useState<TabId>('explanation')

  // WAI-ARIA tabs: arrow keys / Home / End move selection and focus
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab)
    const next =
      e.key === 'ArrowRight' ? TABS[(i + 1) % TABS.length]
      : e.key === 'ArrowLeft' ? TABS[(i - 1 + TABS.length) % TABS.length]
      : e.key === 'Home' ? TABS[0]
      : e.key === 'End' ? TABS[TABS.length - 1]
      : null
    if (!next) return
    e.preventDefault()
    setTab(next)
    document.getElementById(`tab-${next}`)?.focus()
  }

  const explanation = buildExplanation(state, t)

  return (
    <div className="card flex flex-col h-full overflow-hidden" style={{ color: 'var(--color-text)' }}>
      {/* Tab bar */}
      <div className="p-3 pb-0">
        <div className="segmented" role="tablist" aria-label={t('learning.title')} onKeyDown={onTabKey}>
          {TABS.map(tabId => (
            <button
              key={tabId}
              role="tab"
              id={`tab-${tabId}`}
              aria-selected={tab === tabId}
              aria-controls={`panel-${tabId}`}
              tabIndex={tab === tabId ? 0 : -1}
              onClick={() => setTab(tabId)}
              className="flex items-center justify-center gap-1.5"
            >
              {tabId === 'explanation' ? <BookIcon size={14} /> : <TrophyIcon size={14} />}
              {t(`learning.tabs.${tabId}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Content — both panels stay mounted (quiz progress survives tab switches) */}
      {TABS.map(tabId => (
        <div
          key={tabId}
          className="flex-1 overflow-y-auto p-3"
          role="tabpanel"
          id={`panel-${tabId}`}
          aria-labelledby={`tab-${tabId}`}
          hidden={tab !== tabId}
          style={{ maxHeight: 560 }}
        >
          {tabId === 'explanation' ? (
            <div className="flex flex-col gap-3">
              <StageStepper />
              <div className="flex flex-col gap-2">
                {explanation.map((card, i) => (
                  <ExplanationItem key={`${card.kind}-${i}`} card={card} />
                ))}
              </div>
            </div>
          ) : (
            <Quiz />
          )}
        </div>
      ))}
    </div>
  )
}

function StageStepper() {
  const { t } = useTranslation()
  const { state } = useSim()
  const stage = titrationStage(state)
  const order: Stage[] = ['start', 'progress', 'near', 'after']
  const idx = order.indexOf(stage)
  const label = (s: Stage) => (s === 'progress' && hasBuffer(state) ? t('learning.stages.buffer') : t(`learning.stages.${s}`))

  return (
    <div className="rounded-2xl p-3" style={{ background: 'var(--color-surface2)' }}>
      <div className="eyebrow mb-2">{t('learning.stageLabel')}</div>
      <ol className="relative grid grid-cols-4 list-none m-0 p-0" aria-label={t('learning.stageLabel')}>
        {/* connector */}
        <span aria-hidden="true" className="absolute h-0.5 rounded" style={{ top: 9, left: '12.5%', right: '12.5%', background: 'var(--color-surface3)' }} />
        <span
          aria-hidden="true"
          className="absolute h-0.5 rounded"
          style={{ top: 9, left: '12.5%', width: `${(idx / 3) * 75}%`, background: 'var(--color-accent)', transition: 'width 0.4s ease' }}
        />
        {order.map((s, i) => {
          const done = i < idx
          const current = i === idx
          return (
            <li key={s} className="relative flex flex-col items-center gap-1 text-center" aria-current={current ? 'step' : undefined}>
              <span
                className={`grid place-items-center rounded-full ${current ? 'anim-pop' : ''}`}
                key={current ? `cur-${s}` : s}
                style={{
                  width: 20, height: 20,
                  background: done || current ? 'var(--color-accent)' : 'var(--color-surface)',
                  border: `2px solid ${done || current ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
                  color: 'var(--color-on-accent)',
                  boxShadow: current ? '0 0 0 4px var(--color-accent-soft)' : undefined,
                }}
              >
                {done && <CheckIcon size={11} strokeWidth={3.5} />}
              </span>
              <span className="text-[10.5px] leading-tight font-semibold" style={{ color: current ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                {label(s)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function ExplanationItem({ card }: { card: ExplanationCard }) {
  const { t } = useTranslation()
  const { state } = useSim()
  const st = CARD_STYLE[card.kind]
  const indicator = getIndicator(state.indicatorId)
  const suitable = indicatorSuitable(state)

  return (
    <div
      className={`rounded-xl p-3 border ${card.active ? 'anim-fade-up' : ''}`}
      style={{
        borderColor: card.active ? st.color : 'var(--color-border)',
        background: card.active ? `color-mix(in srgb, ${st.color} 9%, var(--color-surface))` : 'var(--color-surface)',
        borderLeftWidth: 3,
        borderLeftColor: st.color,
      }}
    >
      <div className="flex items-center gap-1.5 text-[11.5px] font-bold mb-1" style={{ color: st.color }}>
        {st.icon}
        {t(`learning.cards.${card.kind}`)}
        {card.active && <span className="chip ml-auto" style={{ background: st.color, color: 'var(--color-surface)', fontSize: 10, padding: '1px 7px' }}>{t('learning.nowHere')}</span>}
      </div>
      <p className="text-[13px] leading-relaxed m-0" style={{ color: 'var(--color-text)' }}>{card.text}</p>
      {card.kind === 'indicator' && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {state.indicatorId === 'none' ? (
            <span style={{ color: 'var(--color-text-muted)' }}>{t('learning.noIndicator')}</span>
          ) : (
            <>
              <span style={{ color: 'var(--color-text-muted)' }}>{t('learning.currentIndicator')}:</span>
              <span className={`chip ${suitable ? 'chip-success' : 'chip-danger'}`}>
                {suitable ? <CheckIcon size={12} strokeWidth={3} /> : <XIcon size={12} strokeWidth={3} />}
                {t(indicator.nameKey)} — {suitable ? t('graph.suitable') : t('graph.unsuitable')}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function buildExplanation(state: ReturnType<typeof useSim>['state'], t: (k: string) => string): ExplanationCard[] {
  const { addedVol, equivVol, acidInBeaker } = state

  const typeKey = titrationType(state)
  const cards: ExplanationCard[] = [{ kind: 'overview', text: t(`learning.explanation.initial.${typeKey}`) }]

  // Buffer description depends on which species is the weak sample
  const weakSamplePresent = acidInBeaker ? isWeakAcid(state) : isWeakBase(state)
  const stage = titrationStage(state)
  if (weakSamplePresent) {
    cards.push({
      kind: 'buffer',
      text: t(acidInBeaker ? 'learning.explanation.buffer' : 'learning.explanation.buffer_base'),
      active: stage === 'progress' && hasBuffer(state),
    })
  }

  cards.push({ kind: 'equivalence', text: t('learning.explanation.equivalence') })

  if (addedVol > equivVol * 0.7 && addedVol < equivVol * 1.1) {
    cards.push({ kind: 'near', text: t('learning.explanation.nearEquivalence'), active: true })
  }

  if (addedVol > equivVol * 1.1) {
    // After equivalence: excess base raises pH (acid in beaker) or excess acid lowers pH (base in beaker)
    cards.push({
      kind: 'after',
      text: t(acidInBeaker ? 'learning.explanation.afterEquivalence' : 'learning.explanation.afterEquivalenceExcessAcid'),
      active: true,
    })
  }

  cards.push({ kind: 'indicator', text: t('learning.explanation.indicator') })

  return cards
}
