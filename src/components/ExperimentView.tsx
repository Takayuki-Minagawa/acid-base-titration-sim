import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { getIndicator, getSolutionColor } from '../data/indicators'
import { useTheme } from '../context/ThemeContext'

interface Drop {
  x: number
  y: number
  vy: number
}

export default function ExperimentView() {
  const { t } = useTranslation()
  const { state } = useSim()
  const { theme } = useTheme()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Keep latest state/theme/t in refs so the animation loop doesn't need to restart on every change
  const stateRef = useRef(state)
  const themeRef = useRef(theme)
  const tRef = useRef(t)
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { themeRef.current = theme }, [theme])
  useEffect(() => { tRef.current = t }, [t])

  // Single persistent animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const drops: Drop[] = []
    let prevVol = 0
    let lastTime = 0
    let rafId = 0

    const loop = (now: number) => {
      const dt = lastTime ? (now - lastTime) / 1000 : 0
      lastTime = now

      const s = stateRef.current
      const isDark = themeRef.current === 'dark'
      const ctx = canvas.getContext('2d')
      if (!ctx) { rafId = requestAnimationFrame(loop); return }

      const W = canvas.width
      const H = canvas.height

      // Layout constants
      const buretteX = W * 0.32
      const buretteW = W * 0.08
      const buretteTop = H * 0.03
      const buretteH = H * 0.38
      const buretteTip = buretteTop + buretteH
      const tipBottomY = buretteTip + H * 0.04
      const beakerX = W * 0.55
      const beakerW = W * 0.28
      const beakerTop = H * 0.5
      const beakerH = H * 0.42

      // Spawn drops
      if (s.status === 'running') {
        const delta = s.addedVol - prevVol
        if (delta > 0.02) {
          drops.push({
            x: buretteX + (Math.random() - 0.5) * W * 0.02,
            y: tipBottomY,
            vy: H * 0.45,
          })
        }
      }
      prevVol = s.addedVol

      // Update drops
      for (let i = drops.length - 1; i >= 0; i--) {
        drops[i].y += drops[i].vy * dt
        if (drops[i].y > beakerTop + 20) drops.splice(i, 1)
      }

      // ─── Draw ───
      ctx.clearRect(0, 0, W, H)

      // Background
      ctx.fillStyle = isDark ? '#1e293b' : '#f8fafc'
      ctx.fillRect(0, 0, W, H)

      // ── Burette ──
      const maxVol = s.curve[s.curve.length - 1]?.volume ?? s.equivVol * 2
      const fraction = Math.min(1, s.addedVol / maxVol)
      const liquidH = buretteH * (1 - fraction)

      ctx.fillStyle = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(200,220,255,0.45)'
      ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.rect(buretteX - buretteW / 2, buretteTop, buretteW, buretteH)
      ctx.fill(); ctx.stroke()

      ctx.fillStyle = isDark ? 'rgba(96,165,250,0.45)' : 'rgba(59,130,246,0.35)'
      ctx.fillRect(buretteX - buretteW / 2 + 2, buretteTop + 2, buretteW - 4, liquidH - 2)

      // Tip
      const tipW = buretteW * 0.3
      ctx.fillStyle = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(200,220,255,0.6)'
      ctx.beginPath()
      ctx.rect(buretteX - tipW / 2, buretteTip, tipW, H * 0.04)
      ctx.fill(); ctx.stroke()

      // Burette label
      ctx.fillStyle = isDark ? '#94a3b8' : '#475569'
      ctx.font = `${Math.max(10, W * 0.028)}px system-ui`
      ctx.textAlign = 'center'
      ctx.fillText(tRef.current('experiment.burette'), buretteX, buretteTop - 5)

      // Tick marks
      ctx.strokeStyle = isDark ? '#475569' : '#94a3b8'
      ctx.lineWidth = 1
      for (let i = 0; i <= 10; i++) {
        const y = buretteTop + (i / 10) * buretteH
        const tickLen = i % 5 === 0 ? buretteW * 0.55 : buretteW * 0.25
        ctx.beginPath()
        ctx.moveTo(buretteX + buretteW / 2, y)
        ctx.lineTo(buretteX + buretteW / 2 + tickLen, y)
        ctx.stroke()
      }

      // Added volume label on burette
      ctx.fillStyle = isDark ? '#60a5fa' : '#2563eb'
      ctx.font = `bold ${Math.max(9, W * 0.024)}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(`${s.addedVol.toFixed(1)} mL`, buretteX, buretteTip + H * 0.07)

      // ── Beaker ──
      const indicator = getIndicator(s.indicatorId)
      const solColor = s.indicatorId !== 'none'
        ? getSolutionColor(s.currentPH, indicator)
        : (isDark ? 'rgba(148,210,255,0.35)' : 'rgba(180,225,255,0.6)')

      const baseLiqFrac = 0.52
      const addFrac = Math.min(0.15, (s.addedVol / s.sampleVol) * 0.15)
      const liquidFrac = Math.min(0.88, baseLiqFrac + addFrac)
      const liquidLevel = beakerTop + beakerH * (1 - liquidFrac)
      const liquidHeight = beakerH * liquidFrac

      ctx.fillStyle = solColor
      ctx.fillRect(beakerX - beakerW / 2 + 3, liquidLevel, beakerW - 6, liquidHeight)

      // Glass
      ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(beakerX - beakerW / 2, beakerTop)
      ctx.lineTo(beakerX - beakerW / 2, beakerTop + beakerH)
      ctx.lineTo(beakerX + beakerW / 2, beakerTop + beakerH)
      ctx.lineTo(beakerX + beakerW / 2, beakerTop)
      ctx.stroke()

      // Rim
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(beakerX - beakerW / 2 - 5, beakerTop)
      ctx.lineTo(beakerX + beakerW / 2 + 5, beakerTop)
      ctx.stroke()

      ctx.fillStyle = isDark ? '#94a3b8' : '#475569'
      ctx.font = `${Math.max(10, W * 0.028)}px system-ui`
      ctx.textAlign = 'center'
      ctx.fillText(tRef.current('experiment.beaker'), beakerX, beakerTop - 8)

      // ── Drops ──
      const dropColor = isDark ? 'rgba(96,165,250,0.9)' : 'rgba(59,130,246,0.85)'
      for (const drop of drops) {
        ctx.beginPath()
        ctx.ellipse(drop.x, drop.y, W * 0.011, H * 0.017, 0, 0, Math.PI * 2)
        ctx.fillStyle = dropColor
        ctx.fill()
      }

      // ── pH meter ──
      const meterX = W * 0.88
      const meterY = H * 0.54
      const meterW = W * 0.19
      const meterH = H * 0.2

      ctx.fillStyle = isDark ? '#334155' : '#e2e8f0'
      ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(meterX - meterW / 2, meterY - meterH / 2, meterW, meterH, 8)
      ctx.fill(); ctx.stroke()

      // Screen
      ctx.fillStyle = isDark ? '#0f172a' : '#fff'
      ctx.beginPath()
      ctx.roundRect(meterX - meterW / 2 + 7, meterY - meterH / 2 + 8, meterW - 14, meterH * 0.52, 4)
      ctx.fill()

      // pH value
      const phTextSize = Math.max(14, meterW * 0.30)
      ctx.fillStyle = isDark ? '#60a5fa' : '#1d4ed8'
      ctx.font = `bold ${phTextSize}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(s.currentPH.toFixed(2), meterX, meterY + meterH * 0.05)

      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b'
      ctx.font = `${Math.max(9, meterW * 0.20)}px system-ui`
      ctx.fillText(tRef.current('experiment.phMeter'), meterX, meterY + meterH * 0.43)

      // Probe line
      ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(meterX - meterW / 2, meterY + meterH * 0.1)
      ctx.lineTo(beakerX + beakerW / 2, liquidLevel + liquidHeight * 0.4)
      ctx.stroke()
      ctx.setLineDash([])

      // Equivalence flash
      const nearEquiv = s.equivalencePoints.some(ep => Math.abs(ep.volume - s.addedVol) < 0.4)
      if (nearEquiv && s.addedVol > 0.1) {
        ctx.fillStyle = 'rgba(251,191,36,0.12)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#d97706'
        ctx.font = `bold ${Math.max(11, W * 0.032)}px system-ui`
        ctx.textAlign = 'center'
        ctx.fillText(tRef.current('experiment.equivalenceReached'), W / 2, H * 0.96)
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, []) // Intentional empty deps: loop reads from refs

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    })
    ro.observe(canvas)
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    return () => ro.disconnect()
  }, [])

  return (
    <div className="relative w-full h-full" style={{ background: 'var(--color-surface)' }}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
