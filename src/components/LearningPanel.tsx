import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import Quiz from './Quiz'

export default function LearningPanel() {
  const { t } = useTranslation()
  const { state } = useSim()
  const [tab, setTab] = useState<'explanation' | 'quiz'>('explanation')

  const explanation = buildExplanation(state, t)

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
    >
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
        {(['explanation', 'quiz'] as const).map(tabId => (
          <button
            key={tabId}
            className="flex-1 py-2 text-sm font-medium"
            style={{
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: tab === tabId ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: tab === tabId ? 'var(--color-accent)' : 'var(--color-text-muted)',
              background: 'none',
              cursor: 'pointer',
            } as CSSProperties}
            onClick={() => setTab(tabId)}
          >
            {t(`learning.tabs.${tabId}`)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'explanation' ? (
          <ExplanationTab explanation={explanation} />
        ) : (
          <Quiz />
        )}
      </div>
    </div>
  )
}

function ExplanationTab({ explanation }: { explanation: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      {explanation.map((text, i) => (
        <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
          {text}
        </p>
      ))}
    </div>
  )
}

function buildExplanation(state: ReturnType<typeof useSim>['state'], t: (k: string) => string): string[] {
  const { acidId, baseId, addedVol, equivVol, acidInBeaker } = state

  const isWeakAcid = acidId === 'CH3COOH' || acidId === 'H3PO4'
  const isWeakBase = baseId === 'NH3'

  let typeKey: string
  if (!isWeakAcid && !isWeakBase) typeKey = 'strong_strong'
  else if (!isWeakAcid && isWeakBase) typeKey = 'strong_weak'
  else if (isWeakAcid && !isWeakBase) typeKey = 'weak_strong'
  else typeKey = 'weak_weak'

  const lines: string[] = [t(`learning.explanation.initial.${typeKey}`)]

  // Buffer description depends on which species is the weak sample
  const weakSamplePresent = acidInBeaker ? isWeakAcid : isWeakBase
  if (weakSamplePresent) {
    lines.push(t(acidInBeaker ? 'learning.explanation.buffer' : 'learning.explanation.buffer_base'))
  }

  lines.push(t('learning.explanation.equivalence'))

  if (addedVol > equivVol * 0.7 && addedVol < equivVol * 1.1) {
    lines.push(t('learning.explanation.nearEquivalence'))
  }

  if (addedVol > equivVol * 1.1) {
    // After equivalence: excess base raises pH (acid in beaker) or excess acid lowers pH (base in beaker)
    lines.push(t(acidInBeaker ? 'learning.explanation.afterEquivalence' : 'learning.explanation.afterEquivalenceExcessAcid'))
  }

  lines.push(t('learning.explanation.indicator'))

  return lines
}
