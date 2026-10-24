import { useTranslation } from 'react-i18next'
import { PH_GRADIENT_CSS, phColor } from '../lib/phColor'

/** Horizontal 0–14 pH spectrum with a marker for the current pH */
export default function PHScale({ ph, compact = false }: { ph: number; compact?: boolean }) {
  const { t } = useTranslation()
  const pct = (Math.max(0, Math.min(14, ph)) / 14) * 100

  return (
    <div className="w-full" aria-hidden="true">
      <div className="relative" style={{ height: compact ? 8 : 10 }}>
        <div className="absolute inset-0 rounded-full" style={{ background: PH_GRADIENT_CSS, opacity: 0.9 }} />
        <div
          className="absolute top-1/2 rounded-full"
          style={{
            left: `${pct}%`,
            width: compact ? 14 : 18,
            height: compact ? 14 : 18,
            transform: 'translate(-50%, -50%)',
            background: phColor(ph),
            border: '3px solid var(--color-surface)',
            boxShadow: '0 1px 6px rgba(15,23,42,0.35)',
            transition: 'left 0.15s linear',
          }}
        />
      </div>
      {!compact && (
        <div className="mt-1.5 flex justify-between text-[10.5px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
          <span>0 · {t('region.acidic')}</span>
          <span>7 · {t('region.neutral')}</span>
          <span>{t('region.basic')} · 14</span>
        </div>
      )}
    </div>
  )
}
