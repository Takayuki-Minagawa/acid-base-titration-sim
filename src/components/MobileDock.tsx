import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { phColor } from '../lib/phColor'
import { PlaybackButtons } from './PlaybackControls'

/** Phone-only bottom bar: appears once the experiment's own controls scroll out of view */
export default function MobileDock() {
  const { t } = useTranslation()
  const { state } = useSim()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById('playback-bar')
    if (!target || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0 })
    io.observe(target)
    return () => io.disconnect()
  }, [])

  return (
    <div
      className="mobile-dock fixed left-0 right-0 bottom-0 z-40 items-center gap-2 px-3 pt-2 border-t"
      style={{
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
        background: 'color-mix(in srgb, var(--color-surface) 90%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'var(--color-border)',
        transform: visible ? 'none' : 'translateY(110%)',
        transition: 'transform 0.3s ease',
      }}
      aria-hidden={!visible}
      inert={!visible}
      role="group"
      aria-label={t('controls.playback')}
    >
      <div className="flex flex-col items-center justify-center rounded-xl px-2.5 shrink-0" style={{ background: 'var(--color-surface2)', minHeight: 40 }}>
        <span className="text-[9.5px] font-semibold leading-none" style={{ color: 'var(--color-text-muted)' }}>pH</span>
        <span className="mono text-[15px] font-extrabold leading-tight flex items-center gap-1" style={{ color: 'var(--color-text)' }}>
          <span className="inline-block rounded-full" style={{ width: 7, height: 7, background: phColor(state.currentPH) }} />
          {state.currentPH.toFixed(2)}
        </span>
      </div>
      <PlaybackButtons compact />
    </div>
  )
}
