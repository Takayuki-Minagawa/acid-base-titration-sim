import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const QUESTION_KEYS = ['q1', 'q2', 'q3', 'q4'] as const
type QKey = typeof QUESTION_KEYS[number]

export default function Quiz() {
  const { t } = useTranslation()
  const [current, setCurrent] = useState<QKey>('q1')
  const [selected, setSelected] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [scores, setScores] = useState<Record<QKey, boolean | null>>({
    q1: null, q2: null, q3: null, q4: null,
  })

  const question = t(`learning.quiz.${current}.question`)
  const options = t(`learning.quiz.${current}.options`, { returnObjects: true }) as string[]
  const answer = Number(t(`learning.quiz.${current}.answer`))
  const explanation = t(`learning.quiz.${current}.explanation`)

  const handleSelect = (idx: number) => {
    if (selected !== null) return
    setSelected(idx)
    const correct = idx === answer
    setScores(s => ({ ...s, [current]: correct }))
  }

  const handleNext = () => {
    const idx = QUESTION_KEYS.indexOf(current)
    if (idx < QUESTION_KEYS.length - 1) {
      setCurrent(QUESTION_KEYS[idx + 1])
      setSelected(null)
      setShowExplanation(false)
    }
  }

  const correctCount = Object.values(scores).filter(v => v === true).length

  return (
    <div className="flex flex-col gap-3">
      {/* Score */}
      <div className="flex justify-between items-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>{t('learning.score')}: {correctCount} / {QUESTION_KEYS.length}</span>
        <div className="flex gap-1">
          {QUESTION_KEYS.map(k => (
            <span
              key={k}
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
              style={{
                background: scores[k] === null ? 'var(--color-surface2)' :
                  scores[k] ? '#22c55e' : '#ef4444',
                color: scores[k] === null ? 'var(--color-text-muted)' : '#fff',
              }}
            >
              {QUESTION_KEYS.indexOf(k) + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Question */}
      <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--color-text)' }}>
        {question}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {options.map((opt, idx) => {
          let bg = 'var(--color-surface2)'
          let border = 'var(--color-border)'
          let textColor = 'var(--color-text)'

          if (selected !== null) {
            if (idx === answer) { bg = '#22c55e22'; border = '#22c55e'; textColor = '#16a34a' }
            else if (idx === selected && idx !== answer) { bg = '#ef444422'; border = '#ef4444'; textColor = '#dc2626' }
          } else if (selected === idx) {
            bg = 'var(--color-accent)'
            textColor = '#fff'
          }

          return (
            <button
              key={idx}
              className="text-left px-3 py-2 rounded text-sm border transition-colors cursor-pointer"
              style={{ background: bg, borderColor: border, color: textColor }}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
            >
              {String.fromCharCode(65 + idx)}. {opt}
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {selected !== null && (
        <div>
          <div className="text-sm font-medium" style={{ color: selected === answer ? '#16a34a' : '#dc2626' }}>
            {selected === answer ? `✓ ${t('learning.correct')}` : `✗ ${t('learning.incorrect')}`}
          </div>

          {!showExplanation ? (
            <button
              className="mt-2 text-xs underline cursor-pointer"
              style={{ color: 'var(--color-accent)', background: 'none', border: 'none' }}
              onClick={() => setShowExplanation(true)}
            >
              {t('learning.showAnswer')}
            </button>
          ) : (
            <p className="mt-2 text-xs p-2 rounded leading-relaxed" style={{ background: 'var(--color-surface2)', color: 'var(--color-text)' }}>
              {explanation}
            </p>
          )}

          {QUESTION_KEYS.indexOf(current) < QUESTION_KEYS.length - 1 && (
            <button
              className="mt-2 px-4 py-1.5 rounded text-sm cursor-pointer"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
              onClick={handleNext}
            >
              {t('learning.nextQuestion')} →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
