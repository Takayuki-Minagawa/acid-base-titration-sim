import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useProgress } from '../context/ProgressContext'
import { DISCOVERY_IDS } from '../lib/discoveries'
import { PH_GRADIENT_CSS } from '../lib/phColor'
import { CheckIcon, GlobeIcon, HelpIcon, LockIcon, MoonIcon, SparkleIcon, SunIcon } from './Icons'

export default function Header({ onHelp }: { onHelp: () => void }) {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'ja' ? 'en' : 'ja')
  }

  return (
    <header className="sticky top-0 z-40" style={{ backdropFilter: 'saturate(1.4) blur(12px)', WebkitBackdropFilter: 'saturate(1.4) blur(12px)' }}>
      <div aria-hidden="true" style={{ height: 3, background: PH_GRADIENT_CSS }} />
      <div
        className="border-b"
        style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-surface) 82%, transparent)' }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 mx-auto" style={{ maxWidth: 1600 }}>
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src={`${import.meta.env.BASE_URL}favicon.svg`}
              alt=""
              width={36}
              height={36}
              className="shrink-0 header-logo"
              style={{ borderRadius: 10 }}
            />
            <div className="min-w-0">
              <h1 className="text-[14px] sm:text-lg font-extrabold leading-tight m-0" style={{ color: 'var(--color-text)', textWrap: 'balance' }}>
                {t('title')}
              </h1>
              <p className="text-xs m-0 hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
                {t('subtitle')}
              </p>
            </div>
          </div>

          <div className="header-actions flex items-center gap-1.5 shrink-0">
            <DiscoveryButton />
            <button className="btn btn-ghost btn-icon" onClick={onHelp} aria-label={t('nav.help')} title={t('nav.help')}>
              <HelpIcon />
            </button>
            <button className="btn btn-ghost" onClick={toggleLang} aria-label={t('nav.langToggle')} title={t('nav.langToggle')} style={{ paddingInline: 10 }}>
              <GlobeIcon />
              <span className="hidden sm:inline text-[13px]">{t('lang')}</span>
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleTheme}
              aria-label={`${t('nav.themeToggle')}: ${theme === 'light' ? t('theme.dark') : t('theme.light')}`}
              title={theme === 'light' ? t('theme.dark') : t('theme.light')}
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

function DiscoveryButton() {
  const { t } = useTranslation()
  const { unlocked, typesSeen } = useProgress()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const total = DISCOVERY_IDS.length
  const n = unlocked.length

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const R = 9
  const C = 2 * Math.PI * R

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={btnRef}
        className="btn btn-ghost"
        style={{ paddingInline: 10 }}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${t('discoveries.title')} (${t('discoveries.progress', { n, total })})`}
      >
        {/* keyed by count → re-mounts and bounces whenever a discovery unlocks */}
        <svg key={n} width={22} height={22} viewBox="0 0 24 24" aria-hidden="true" className={n > 0 ? 'anim-pop' : ''}>
          <circle cx="12" cy="12" r={R} fill="none" stroke="var(--color-surface3)" strokeWidth="3" />
          <circle
            cx="12" cy="12" r={R} fill="none" stroke="url(#discGrad)" strokeWidth="3" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - n / total)}
            transform="rotate(-90 12 12)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
          <defs>
            <linearGradient id="discGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f59e0b" />
              <stop offset="1" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
        <span className="mono text-[13px]">{n}<span style={{ color: 'var(--color-text-muted)' }}>/{total}</span></span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('discoveries.title')}
          className="absolute right-0 mt-2 rounded-2xl border p-3 anim-fade-up"
          style={{
            width: 'min(340px, calc(100vw - 24px))',
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-pop)',
            maxHeight: '70vh',
            overflowY: 'auto',
          }}
        >
          <div className="flex items-center gap-2 px-1">
            <span className="grid place-items-center rounded-lg" style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#f59e0b,#ec4899)', color: '#fff' }}>
              <SparkleIcon size={16} />
            </span>
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{t('discoveries.title')}</div>
              <div className="text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>{t('discoveries.lead')}</div>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-surface3)' }}>
            <div className="h-full rounded-full" style={{ width: `${(n / total) * 100}%`, background: 'linear-gradient(90deg,#f59e0b,#ec4899)', transition: 'width 0.6s ease' }} />
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 list-none m-0 p-0">
            {DISCOVERY_IDS.map(id => {
              const done = unlocked.includes(id)
              return (
                <li
                  key={id}
                  className="flex items-start gap-2.5 rounded-xl p-2"
                  style={{ background: done ? 'var(--color-warn-soft)' : 'var(--color-surface2)' }}
                >
                  <span
                    className="grid place-items-center rounded-full shrink-0 mt-0.5"
                    style={{
                      width: 22, height: 22,
                      background: done ? 'linear-gradient(135deg,#f59e0b,#ec4899)' : 'var(--color-surface3)',
                      color: done ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    {done ? <CheckIcon size={13} strokeWidth={3} /> : <LockIcon size={11} />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold flex items-center gap-2" style={{ color: done ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                      {t(`discoveries.items.${id}.title`)}
                      {id === 'allTypes' && !done && (
                        <span className="chip chip-muted" style={{ fontSize: 10, padding: '1px 6px' }}>
                          {t('discoveries.typesProgress', { n: typesSeen.length })}
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] leading-snug" style={{ color: 'var(--color-text-muted)' }}>
                      {t(`discoveries.items.${id}.hint`)}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
