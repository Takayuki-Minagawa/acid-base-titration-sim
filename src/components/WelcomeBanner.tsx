import { useTranslation } from 'react-i18next'
import { PH_GRADIENT_CSS } from '../lib/phColor'
import { ArrowRightIcon, ChartIcon, DropIcon, PlayIcon, SwapIcon, TrophyIcon, XIcon } from './Icons'

const STEP_ICONS = [PlayIcon, ChartIcon, SwapIcon, TrophyIcon]

export default function WelcomeBanner({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  const { t } = useTranslation()
  const steps = t('welcome.steps', { returnObjects: true }) as { title: string; desc: string }[]

  return (
    <section
      className="card relative overflow-hidden anim-fade-up"
      aria-labelledby="welcome-title"
      style={{ padding: 0 }}
    >
      {/* Decorative spectrum wash */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: PH_GRADIENT_CSS, opacity: 0.07 }}
      />
      <div aria-hidden="true" className="absolute left-0 right-0 top-0" style={{ height: 4, background: PH_GRADIENT_CSS }} />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 p-4 sm:p-5">
        <div className="flex-1 min-w-0">
          <div className="eyebrow flex items-center gap-1.5" style={{ color: 'var(--color-accent)' }}>
            <DropIcon size={13} /> {t('welcome.eyebrow')}
          </div>
          <h2 id="welcome-title" className="mt-1 text-lg sm:text-xl font-extrabold leading-snug" style={{ color: 'var(--color-text)' }}>
            {t('welcome.title')}
          </h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {t('welcome.lead')}
          </p>
        </div>

        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:w-[560px] shrink-0 m-0 p-0 list-none">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i]
            return (
              <li
                key={i}
                className="rounded-xl p-2.5 border"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  <span className="grid place-items-center rounded-lg" style={{ width: 22, height: 22, background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
                    <Icon size={12} />
                  </span>
                  <span className="mono" style={{ color: 'var(--color-text-muted)' }}>{i + 1}</span>
                  {step.title}
                </div>
                <p className="mt-1 text-[11.5px] leading-snug m-0" style={{ color: 'var(--color-text-muted)' }}>{step.desc}</p>
              </li>
            )
          })}
        </ol>

        <div className="flex items-center gap-2 shrink-0">
          <button className="btn btn-primary flex-1 lg:flex-none" onClick={onStart}>
            {t('welcome.cta')} <ArrowRightIcon size={16} />
          </button>
        </div>
      </div>

      <button
        className="btn btn-icon btn-sm absolute"
        style={{ top: 10, right: 10, width: 30, minHeight: 30, background: 'transparent', color: 'var(--color-text-muted)' }}
        onClick={onClose}
        aria-label={t('welcome.dismiss')}
      >
        <XIcon size={16} />
      </button>
    </section>
  )
}
