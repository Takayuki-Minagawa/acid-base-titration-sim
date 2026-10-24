import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProgress } from '../context/ProgressContext'
import { ArrowRightIcon, CheckIcon, LightbulbIcon, ResetIcon, TrophyIcon, XIcon } from './Icons'

const QUESTION_KEYS = ['q1', 'q2', 'q3', 'q4'] as const
type QKey = typeof QUESTION_KEYS[number]

const EMPTY_SCORES: Record<QKey, boolean | null> = { q1: null, q2: null, q3: null, q4: null }

export default function Quiz() {
  const { t } = useTranslation()
  const { unlock } = useProgress()
  const [current, setCurrent] = useState<QKey>('q1')
  const [selected, setSelected] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [finished, setFinished] = useState(false)
  const [scores, setScores] = useState<Record<QKey, boolean | null>>(EMPTY_SCORES)

  const question = t(`learning.quiz.${current}.question`)
  const options = t(`learning.quiz.${current}.options`, { returnObjects: true }) as string[]
  const answer = Number(t(`learning.quiz.${current}.answer`))
  const explanation = t(`learning.quiz.${current}.explanation`)
  const qIndex = QUESTION_KEYS.indexOf(current)
  const isLast = qIndex === QUESTION_KEYS.length - 1

  const handleSelect = (idx: number) => {
    if (selected !== null) return
    setSelected(idx)
    const correct = idx === answer
    const next = { ...scores, [current]: correct }
    setScores(next)
    if (QUESTION_KEYS.every(k => next[k] === true)) unlock('quizPerfect')
  }

  const handleNext = () => {
    if (!isLast) {
      setCurrent(QUESTION_KEYS[qIndex + 1])
      setSelected(null)
      setShowExplanation(false)
    } else {
      setFinished(true)
    }
  }

  const handleRetry = () => {
    setScores(EMPTY_SCORES)
    setCurrent('q1')
    setSelected(null)
    setShowExplanation(false)
    setFinished(false)
  }

  const correctCount = Object.values(scores).filter(v => v === true).length

  return (
    <div className="flex flex-col gap-3">
      {/* Progress */}
      <div className="flex justify-between items-center gap-3">
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {t('learning.score')}: <span className="mono" style={{ color: 'var(--color-text)' }}>{correctCount} / {QUESTION_KEYS.length}</span>
        </span>
        <div className="flex gap-1 flex-1 max-w-[180px]" aria-hidden="true">
          {QUESTION_KEYS.map(k => (
            <span
              key={k}
              className="h-1.5 flex-1 rounded-full"
              style={{
                background: scores[k] === null
                  ? (k === current && !finished ? 'var(--color-accent)' : 'var(--color-surface3)')
                  : scores[k] ? '#22c55e' : '#ef4444',
                opacity: scores[k] === null && k === current && !finished ? 0.5 : 1,
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </div>
      </div>

      {finished ? (
        <QuizResult correct={correctCount} total={QUESTION_KEYS.length} onRetry={handleRetry} />
      ) : (
        <div key={current} className="flex flex-col gap-3 anim-fade-up">
          {/* Question */}
          <div>
            <div className="eyebrow" style={{ color: 'var(--color-accent)' }}>{t('learning.question')} {qIndex + 1}</div>
            <p className="text-sm font-semibold leading-relaxed m-0 mt-0.5" style={{ color: 'var(--color-text)' }}>
              {question}
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2" role="group" aria-label={question}>
            {options.map((opt, idx) => {
              let bg = 'var(--color-surface)'
              let border = 'var(--color-border)'
              let textColor = 'var(--color-text)'
              let bubbleBg = 'var(--color-surface2)'
              let bubbleColor = 'var(--color-text-muted)'
              let anim = ''

              if (selected !== null) {
                if (idx === answer) {
                  bg = 'var(--color-success-soft)'; border = '#22c55e'; textColor = 'var(--color-success)'
                  bubbleBg = '#22c55e'; bubbleColor = '#fff'; anim = 'anim-pop'
                } else if (idx === selected) {
                  bg = 'var(--color-danger-soft)'; border = '#ef4444'; textColor = 'var(--color-danger)'
                  bubbleBg = '#ef4444'; bubbleColor = '#fff'; anim = 'anim-shake'
                } else {
                  textColor = 'var(--color-text-muted)'
                }
              }

              return (
                <button
                  key={idx}
                  className={`quiz-option flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-sm border cursor-pointer ${anim}`}
                  style={{ background: bg, borderColor: border, color: textColor, borderWidth: 1.5, font: 'inherit', transition: 'background-color 0.2s, border-color 0.2s, color 0.2s' }}
                  onClick={() => handleSelect(idx)}
                  disabled={selected !== null}
                  aria-label={`${String.fromCharCode(65 + idx)}. ${opt}${selected !== null && idx === answer ? ` (${t('learning.correct')})` : ''}`}
                >
                  <span
                    className="grid place-items-center rounded-lg shrink-0 text-xs font-bold mono"
                    style={{ width: 24, height: 24, background: bubbleBg, color: bubbleColor }}
                  >
                    {selected !== null && idx === answer ? <CheckIcon size={13} strokeWidth={3} />
                      : selected === idx ? <XIcon size={13} strokeWidth={3} />
                      : String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              )
            })}
          </div>

          {/* Feedback */}
          {selected !== null && (
            <div className="flex flex-col gap-2 anim-fade-up" role="status">
              <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: selected === answer ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {selected === answer ? <CheckIcon size={16} strokeWidth={3} /> : <XIcon size={16} strokeWidth={3} />}
                {selected === answer ? t('learning.correct') : t('learning.incorrect')}
              </div>

              {!showExplanation ? (
                <button
                  className="btn btn-ghost btn-sm self-start"
                  onClick={() => setShowExplanation(true)}
                >
                  <LightbulbIcon size={14} /> {t('learning.showAnswer')}
                </button>
              ) : (
                <p className="text-xs p-3 rounded-xl leading-relaxed m-0 anim-fade-up" style={{ background: 'var(--color-surface2)', color: 'var(--color-text)' }}>
                  {explanation}
                </p>
              )}

              <button className="btn btn-primary btn-sm self-end" onClick={handleNext}>
                {isLast ? t('learning.seeResult') : t('learning.nextQuestion')} <ArrowRightIcon size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function QuizResult({ correct, total, onRetry }: { correct: number; total: number; onRetry: () => void }) {
  const { t } = useTranslation()
  const perfect = correct === total
  const msg = perfect ? 'learning.resultPerfect' : correct >= total / 2 ? 'learning.resultGood' : 'learning.resultRetry'
  const R = 34
  const C = 2 * Math.PI * R

  return (
    <div className="flex flex-col items-center text-center gap-3 py-2 anim-fade-up" role="status">
      <div className="relative anim-pop" style={{ width: 88, height: 88 }}>
        <svg width={88} height={88} viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r={R} fill="none" stroke="var(--color-surface3)" strokeWidth="8" />
          <circle
            cx="44" cy="44" r={R} fill="none"
            stroke={perfect ? '#f59e0b' : 'var(--color-accent)'} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - correct / total)}
            transform="rotate(-90 44 44)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          {perfect
            ? <TrophyIcon size={30} style={{ color: '#f59e0b' }} />
            : <span className="mono text-xl font-extrabold" style={{ color: 'var(--color-text)' }}>{correct}/{total}</span>}
        </div>
      </div>
      <div>
        <div className="eyebrow">{t('learning.resultTitle')}</div>
        <div className="text-lg font-extrabold mono" style={{ color: 'var(--color-text)' }}>{correct} / {total}</div>
        <p className="text-sm m-0 mt-1" style={{ color: 'var(--color-text-muted)' }}>{t(msg)}</p>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={onRetry}>
        <ResetIcon size={14} /> {t('learning.retry')}
      </button>
    </div>
  )
}
