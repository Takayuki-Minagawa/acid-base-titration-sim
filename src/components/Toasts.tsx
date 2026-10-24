import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useProgress, type Toast } from '../context/ProgressContext'
import { SparkleIcon, XIcon } from './Icons'

export default function Toasts() {
  const { toasts, dismissToast } = useProgress()

  return (
    <div
      className="toast-stack fixed z-50 flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.key} toast={toast} onClose={dismissToast} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (key: number) => void }) {
  const { t } = useTranslation()

  // onClose is stable, so the timer is not restarted by re-renders during a running titration
  useEffect(() => {
    const id = window.setTimeout(() => onClose(toast.key), 4500)
    return () => window.clearTimeout(id)
  }, [onClose, toast.key])

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-2xl border toast-item"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-pop)',
        animation: 'toast-in 0.35s cubic-bezier(.2,.9,.3,1.3) both',
      }}
    >
      <span
        className="grid place-items-center shrink-0 rounded-xl anim-pop"
        style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#f59e0b,#ec4899)', color: '#fff' }}
      >
        <SparkleIcon size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold" style={{ color: 'var(--color-warn)' }}>{t('discoveries.toast')}</div>
        <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{t(`discoveries.items.${toast.id}.title`)}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{t(`discoveries.items.${toast.id}.hint`)}</div>
      </div>
      <button className="btn btn-icon btn-sm pointer-events-auto" style={{ width: 28, minHeight: 28, color: 'var(--color-text-muted)', background: 'none' }} onClick={() => onClose(toast.key)} aria-label={t('welcome.dismiss')}>
        <XIcon size={14} />
      </button>
    </div>
  )
}
