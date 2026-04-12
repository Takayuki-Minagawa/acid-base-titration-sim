import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'

export default function Header() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'ja' ? 'en' : 'ja')
  }

  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <div>
        <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--color-text)' }}>
          {t('title')}
        </h1>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {t('subtitle')}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={toggleLang}
          className="px-3 py-1 rounded text-sm border cursor-pointer"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-surface2)',
            color: 'var(--color-text)',
          }}
        >
          {t('lang')}
        </button>
        <button
          onClick={toggleTheme}
          className="px-3 py-1 rounded text-sm border cursor-pointer"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-surface2)',
            color: 'var(--color-text)',
          }}
        >
          {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? t('theme.dark') : t('theme.light')}
        </button>
      </div>
    </header>
  )
}
