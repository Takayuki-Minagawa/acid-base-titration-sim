import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSim } from '../context/SimContext'
import { getIndicator, getSolutionColor } from '../data/indicators'
import { useTheme } from '../context/ThemeContext'
import { phColor, phRegion } from '../lib/phColor'
import { maxVolume } from '../lib/stage'
import PHScale from './PHScale'
import { PlaybackButtons, SeekSlider } from './PlaybackControls'
import { FlaskIcon, TargetIcon } from './Icons'

// The scene is drawn in a fixed design space and scaled to fit the canvas.
const STAGE_W = 560
const STAGE_H = 400
const BENCH_Y = 382

// Burette
const BX = 190
const TUBE_HALF = 11
const TUBE_TOP = 18
const TUBE_BOTTOM = 196
const SCALE_TOP = 26 // 0 mL mark
const SCALE_BOTTOM = 188 // max mark
const NOZZLE_END = 252

// Beaker
const BK_L = 124
const BK_R = 256
const BK_TOP = 246
const BK_BOTTOM = 350

// Probe & meter
const PROBE_X = 236
const METER = { x: 352, y: 232, w: 168, h: 148 }

// Space taken by the DOM pH readout overlay (CSS px)
const HUD_W = 150
const HUD_H = 82

const FONT = "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', sans-serif"
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"

interface Drop { y: number; vy: number }
interface Ripple { t: number }
interface Blob { t: number; dur: number; color: RGBA }
type RGBA = [number, number, number, number]

function parseColor(c: string): RGBA {
  if (c === 'transparent') return [255, 255, 255, 0]
  const m8 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c)
  if (m8) return [parseInt(m8[1], 16), parseInt(m8[2], 16), parseInt(m8[3], 16), parseInt(m8[4], 16) / 255]
  const m6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c)
  if (m6) return [parseInt(m6[1], 16), parseInt(m6[2], 16), parseInt(m6[3], 16), 1]
  const m = /rgba?\(([^)]+)\)/.exec(c)
  if (m) {
    const p = m[1].split(',').map(Number)
    return [p[0], p[1], p[2], p[3] ?? 1]
  }
  return [255, 255, 255, 0]
}

const rgba = (c: RGBA, alphaMul = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${(c[3] * alphaMul).toFixed(3)})`

const PALETTE = {
  light: {
    bgTop: '#f8fafc', bgBottom: '#eef2f8', bench: '#e3e8f0', benchEdge: '#cdd5e1',
    glass: 'rgba(71,85,105,0.7)', glassFill: 'rgba(255,255,255,0.45)', shine: 'rgba(255,255,255,0.75)',
    metal: '#9aa6b8', metalDark: '#6b7789', text: '#475569', labelBg: 'rgba(255,255,255,0.9)',
    water: [190, 218, 248, 0.55] as RGBA, titrant: [125, 175, 250, 0.5] as RGBA,
    plate: '#cfd7e3', plateTop: '#e2e8f0', tick: 'rgba(71,85,105,0.65)',
  },
  dark: {
    bgTop: '#131c31', bgBottom: '#0e1628', bench: '#1a2540', benchEdge: '#2a3a5e',
    glass: 'rgba(203,213,225,0.6)', glassFill: 'rgba(255,255,255,0.04)', shine: 'rgba(255,255,255,0.22)',
    metal: '#5b6b86', metalDark: '#43516a', text: '#a5b1c8', labelBg: 'rgba(17,26,46,0.9)',
    water: [110, 160, 230, 0.32] as RGBA, titrant: [110, 160, 250, 0.45] as RGBA,
    plate: '#2a3653', plateTop: '#34425f', tick: 'rgba(203,213,225,0.55)',
  },
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

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const drops: Drop[] = []
    const ripples: Ripple[] = []
    const blobs: Blob[] = []
    let prevVol = stateRef.current.addedVol
    let spawnTimer = 0
    let stirAngle = 0
    let lastTime = 0
    let rafId = 0
    let shown: RGBA | null = null // displayed (smoothed) solution colour
    let lastSig = ''
    let cssW = 0, cssH = 0, dpr = 1

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      cssW = canvas.clientWidth
      cssH = canvas.clientHeight
      canvas.width = Math.max(1, Math.round(cssW * dpr))
      canvas.height = Math.max(1, Math.round(cssH * dpr))
      lastSig = ''
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop)
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0
      lastTime = now

      const s = stateRef.current
      const reduced = motionQuery.matches
      const P = PALETTE[themeRef.current === 'dark' ? 'dark' : 'light']
      const ctx = canvas.getContext('2d')
      if (!ctx || cssW === 0) return

      const maxVol = maxVolume(s)
      const indicator = getIndicator(s.indicatorId)
      const running = s.status === 'running'

      // Liquid geometry
      const capacity = (s.sampleVol + maxVol) * 1.2
      const levelFrac = Math.max(0.2, Math.min(0.86, (s.sampleVol + s.addedVol) / capacity))
      const surfaceY = BK_BOTTOM - (BK_BOTTOM - BK_TOP) * levelFrac

      // ── Spawn drops ──
      const delta = s.addedVol - prevVol
      prevVol = s.addedVol
      if (running) {
        spawnTimer -= dt
        const interval = Math.max(0.08, Math.min(0.6, 0.05 / Math.max(s.dropSpeed, 0.01)))
        if (spawnTimer <= 0) {
          drops.push({ y: NOZZLE_END, vy: 40 })
          spawnTimer = interval
        }
      } else if (delta > 0.001 && delta <= 0.2) {
        drops.push({ y: NOZZLE_END, vy: 40 }) // single drop / small seek
      }

      // ── Update drops → ripples & local colour blobs ──
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]
        d.vy += 1100 * dt
        d.y += d.vy * dt
        if (d.y >= surfaceY) {
          drops.splice(i, 1)
          if (!reduced) {
            ripples.push({ t: 0 })
            if (s.indicatorId !== 'none') {
              // A drop of titrant briefly colours the solution locally before stirring mixes it in —
              // the flash lingers longer as the equivalence point approaches.
              const localPH = s.acidInBeaker ? 12.5 : 1.5
              const closeness = Math.max(0, 1 - Math.abs(s.addedVol - s.equivVol) / (0.15 * s.equivVol))
              blobs.push({ t: 0, dur: 0.35 + 1.4 * closeness, color: parseColor(getSolutionColor(localPH, indicator)) })
            }
          }
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].t += dt
        if (ripples[i].t > 0.6) ripples.splice(i, 1)
      }
      for (let i = blobs.length - 1; i >= 0; i--) {
        blobs[i].t += dt
        if (blobs[i].t > blobs[i].dur) blobs.splice(i, 1)
      }
      if (blobs.length > 6) blobs.splice(0, blobs.length - 6)

      // ── Smooth solution colour ──
      const target = s.indicatorId !== 'none' ? parseColor(getSolutionColor(s.currentPH, indicator)) : [0, 0, 0, 0] as RGBA
      if (!shown || reduced) shown = [...target]
      else {
        const k = 1 - Math.exp(-dt * 7)
        for (let i = 0; i < 4; i++) shown[i] += (target[i] - shown[i]) * k
      }
      const colorSettled = shown.every((v, i) => Math.abs(v - target[i]) < (i === 3 ? 0.003 : 0.6))

      const stirring = running && !reduced
      if (stirring) stirAngle += dt * 14

      const nearEquiv = s.addedVol > 0.1 && s.equivalencePoints.some(ep => Math.abs(ep.volume - s.addedVol) < Math.max(0.4, ep.volume * 0.012))

      // Skip redraw when nothing is moving
      const animating = drops.length > 0 || ripples.length > 0 || blobs.length > 0 || stirring || !colorSettled || (nearEquiv && !reduced)
      const sig = `${s.addedVol}|${s.currentPH}|${s.indicatorId}|${themeRef.current}|${s.status}|${s.sampleVol}|${maxVol}|${tRef.current('experiment.beaker')}`
      if (!animating && sig === lastSig) return
      lastSig = sig

      // ─── Draw ───
      let scale = Math.min(cssW / STAGE_W, cssH / STAGE_H)
      // If the pH HUD (top-left) would cover the burette reading area (stage x ≥ 120, y ≥ 10),
      // shrink the scene so it starts below the HUD
      const hudOverlaps = (s: number) => HUD_W > (cssW - STAGE_W * s) / 2 + 120 * s && HUD_H > cssH - STAGE_H * s + 10 * s
      if (hudOverlaps(scale)) scale = Math.min(cssW / STAGE_W, (cssH - HUD_H) / STAGE_H)
      const ox = (cssW - STAGE_W * scale) / 2
      // Anchor the scene to the bottom: spare height ends up on top, under the pH HUD
      const oy = cssH - STAGE_H * scale
      // Small canvases (phones) get proportionally larger text
      const textK = Math.min(1.35, Math.max(1, 0.85 / scale))

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const bg = ctx.createLinearGradient(0, 0, 0, cssH)
      bg.addColorStop(0, P.bgTop)
      bg.addColorStop(1, P.bgBottom)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, cssW, cssH)

      // Bench spans the full width
      const benchY = oy + BENCH_Y * scale
      ctx.fillStyle = P.bench
      ctx.fillRect(0, benchY, cssW, cssH - benchY)
      ctx.fillStyle = P.benchEdge
      ctx.fillRect(0, benchY, cssW, 2)

      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy)

      // ── Stand ──
      ctx.fillStyle = P.metalDark
      roundRect(ctx, 40, 372, 150, 10, 4); ctx.fill()
      ctx.fillStyle = P.metal
      roundRect(ctx, 66, 14, 7, 360, 3); ctx.fill()
      // Clamp arm
      ctx.fillStyle = P.metalDark
      roundRect(ctx, 70, 38, BX - 70 - TUBE_HALF, 6, 3); ctx.fill()
      roundRect(ctx, BX - TUBE_HALF - 6, 32, 6, 18, 2); ctx.fill()
      roundRect(ctx, BX + TUBE_HALF, 32, 6, 18, 2); ctx.fill()

      // ── Burette ──
      const fraction = Math.min(1, s.addedVol / maxVol)
      const levelY = SCALE_TOP + (SCALE_BOTTOM - SCALE_TOP) * fraction
      // glass body
      ctx.fillStyle = P.glassFill
      roundRect(ctx, BX - TUBE_HALF, TUBE_TOP, TUBE_HALF * 2, TUBE_BOTTOM - TUBE_TOP, 4); ctx.fill()
      // titrant liquid
      ctx.save()
      roundRect(ctx, BX - TUBE_HALF + 2, TUBE_TOP + 2, TUBE_HALF * 2 - 4, TUBE_BOTTOM - TUBE_TOP - 2, 3); ctx.clip()
      const tg = ctx.createLinearGradient(BX - TUBE_HALF, 0, BX + TUBE_HALF, 0)
      tg.addColorStop(0, rgba(P.titrant, 1.2))
      tg.addColorStop(0.5, rgba(P.titrant, 0.7))
      tg.addColorStop(1, rgba(P.titrant, 1.3))
      ctx.fillStyle = tg
      ctx.fillRect(BX - TUBE_HALF, levelY, TUBE_HALF * 2, TUBE_BOTTOM - levelY)
      // meniscus
      ctx.strokeStyle = rgba(P.titrant, 1.8)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(BX - TUBE_HALF + 2, levelY - 2)
      ctx.quadraticCurveTo(BX, levelY + 3, BX + TUBE_HALF - 2, levelY - 2)
      ctx.stroke()
      ctx.restore()
      // taper + stopcock + nozzle
      ctx.fillStyle = rgba(P.titrant, levelY < TUBE_BOTTOM ? 1 : 0.2)
      ctx.beginPath()
      ctx.moveTo(BX - TUBE_HALF, TUBE_BOTTOM)
      ctx.lineTo(BX + TUBE_HALF, TUBE_BOTTOM)
      ctx.lineTo(BX + 4, TUBE_BOTTOM + 12)
      ctx.lineTo(BX - 4, TUBE_BOTTOM + 12)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = P.glass
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = P.glassFill
      ctx.fillRect(BX - 2.5, TUBE_BOTTOM + 24, 5, NOZZLE_END - TUBE_BOTTOM - 24)
      ctx.strokeRect(BX - 2.5, TUBE_BOTTOM + 24, 5, NOZZLE_END - TUBE_BOTTOM - 24)
      // stopcock body
      ctx.fillStyle = P.metalDark
      roundRect(ctx, BX - 6, TUBE_BOTTOM + 11, 12, 14, 3); ctx.fill()
      // stopcock handle: horizontal = closed, turned (short) = open
      const open = running
      ctx.fillStyle = open ? '#f97316' : P.metal
      if (open) { roundRect(ctx, BX - 4, TUBE_BOTTOM + 6, 8, 24, 3) } else { roundRect(ctx, BX - 20, TUBE_BOTTOM + 15, 40, 6, 3) }
      ctx.fill()
      // outline + shine
      ctx.strokeStyle = P.glass
      ctx.lineWidth = 1.5
      roundRect(ctx, BX - TUBE_HALF, TUBE_TOP, TUBE_HALF * 2, TUBE_BOTTOM - TUBE_TOP, 4); ctx.stroke()
      ctx.fillStyle = P.shine
      ctx.fillRect(BX - TUBE_HALF + 3, TUBE_TOP + 6, 2.5, TUBE_BOTTOM - TUBE_TOP - 14)
      // graduations
      ctx.strokeStyle = P.tick
      ctx.fillStyle = P.text
      ctx.lineWidth = 1
      ctx.font = `600 ${9 * textK}px ${MONO}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      for (let i = 0; i <= 20; i++) {
        const y = SCALE_TOP + ((SCALE_BOTTOM - SCALE_TOP) * i) / 20
        const major = i % 4 === 0
        ctx.beginPath()
        ctx.moveTo(BX + TUBE_HALF - (major ? 9 : 5), y)
        ctx.lineTo(BX + TUBE_HALF, y)
        ctx.stroke()
        if (major) ctx.fillText(String(Math.round((maxVol * i) / 20)), BX + TUBE_HALF + 4, y)
      }
      // reading tag
      const tag = `${s.addedVol.toFixed(1)} mL`
      ctx.font = `700 ${10.5 * textK}px ${MONO}`
      const tw = ctx.measureText(tag).width + 12
      ctx.fillStyle = themeRef.current === 'dark' ? '#818cf8' : '#4f46e5'
      roundRect(ctx, BX - TUBE_HALF - 8 - tw, levelY - 9 * textK, tw, 18 * textK, 9 * textK); ctx.fill()
      ctx.beginPath()
      ctx.moveTo(BX - TUBE_HALF - 8, levelY - 4)
      ctx.lineTo(BX - TUBE_HALF - 2, levelY)
      ctx.lineTo(BX - TUBE_HALF - 8, levelY + 4)
      ctx.fill()
      ctx.fillStyle = themeRef.current === 'dark' ? '#0b1020' : '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(tag, BX - TUBE_HALF - 8 - tw / 2, levelY + 0.5)

      // ── Drops ──
      ctx.fillStyle = rgba(P.titrant, 1.8)
      for (const d of drops) {
        ctx.beginPath()
        ctx.moveTo(BX, d.y - 7)
        ctx.bezierCurveTo(BX + 1, d.y - 4, BX + 3.6, d.y - 1.5, BX + 3.6, d.y + 1)
        ctx.arc(BX, d.y + 1, 3.6, 0, Math.PI)
        ctx.bezierCurveTo(BX - 3.6, d.y - 1.5, BX - 1, d.y - 4, BX, d.y - 7)
        ctx.fill()
      }

      // ── Magnetic stirrer ──
      ctx.fillStyle = P.plate
      roundRect(ctx, 106, BK_BOTTOM + 2, 168, BENCH_Y - BK_BOTTOM - 2, 7); ctx.fill()
      ctx.fillStyle = P.plateTop
      roundRect(ctx, 112, BK_BOTTOM + 2, 156, 6, 3); ctx.fill()
      ctx.fillStyle = running ? '#22c55e' : P.metalDark
      ctx.beginPath(); ctx.arc(124, BK_BOTTOM + 19, 3, 0, Math.PI * 2); ctx.fill()
      if (running) {
        ctx.fillStyle = 'rgba(34,197,94,0.25)'
        ctx.beginPath(); ctx.arc(124, BK_BOTTOM + 19, 6, 0, Math.PI * 2); ctx.fill()
      }
      ctx.fillStyle = P.metalDark
      ctx.beginPath(); ctx.arc(256, BK_BOTTOM + 19, 5, 0, Math.PI * 2); ctx.fill()

      // ── Beaker glow near the equivalence point ──
      if (nearEquiv) {
        const pulse = reduced ? 0.6 : 0.5 + 0.5 * Math.sin(now / 220)
        ctx.save()
        ctx.shadowColor = `rgba(245,158,11,${0.35 + 0.4 * pulse})`
        ctx.shadowBlur = 18 + 14 * pulse
        ctx.strokeStyle = `rgba(245,158,11,${0.5 + 0.4 * pulse})`
        ctx.lineWidth = 3
        beakerPath(ctx); ctx.stroke()
        ctx.restore()
      }

      // ── Beaker liquid ──
      ctx.save()
      beakerPath(ctx, 2); ctx.clip()
      ctx.fillStyle = P.glassFill
      ctx.fillRect(BK_L, BK_TOP, BK_R - BK_L, BK_BOTTOM - BK_TOP)
      const wave = stirring ? 1.4 : 0
      const liquidPath = () => {
        ctx.beginPath()
        ctx.moveTo(BK_L, BK_BOTTOM + 2)
        ctx.lineTo(BK_L, surfaceY)
        for (let x = BK_L; x <= BK_R; x += 6) {
          ctx.lineTo(x, surfaceY + Math.sin(x / 11 + stirAngle * 0.6) * wave)
        }
        ctx.lineTo(BK_R, BK_BOTTOM + 2)
        ctx.closePath()
      }
      liquidPath()
      ctx.fillStyle = rgba(P.water)
      ctx.fill()
      liquidPath()
      ctx.fillStyle = rgba(shown, 0.85)
      ctx.fill()
      // local colour flashes from fresh drops
      for (const b of blobs) {
        const p = b.t / b.dur
        const r = 12 + 46 * p
        const g = ctx.createRadialGradient(BX, surfaceY + 10, 0, BX, surfaceY + 10, r)
        g.addColorStop(0, rgba(b.color, 0.9 * (1 - p)))
        g.addColorStop(1, rgba(b.color, 0))
        ctx.fillStyle = g
        ctx.fillRect(BX - r, surfaceY - 2, r * 2, r * 2)
      }
      // surface highlight
      ctx.strokeStyle = P.shine
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let x = BK_L; x <= BK_R; x += 6) {
        const y = surfaceY + Math.sin(x / 11 + stirAngle * 0.6) * wave
        if (x === BK_L) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
      // ripples
      for (const rp of ripples) {
        const p = rp.t / 0.6
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - p)})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.ellipse(BX, surfaceY + 1, 4 + 26 * p, 1.5 + 3 * p, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      // stir bar
      const barW = 30 * Math.abs(Math.cos(stirAngle)) + 8
      ctx.fillStyle = themeRef.current === 'dark' ? '#e2e8f0' : '#f8fafc'
      ctx.strokeStyle = P.metalDark
      ctx.lineWidth = 1
      roundRect(ctx, (BK_L + BK_R) / 2 - barW / 2, BK_BOTTOM - 9, barW, 6, 3); ctx.fill(); ctx.stroke()
      ctx.restore()

      // ── Probe (behind the glass front) ──
      ctx.fillStyle = themeRef.current === 'dark' ? '#cbd5e1' : '#334155'
      roundRect(ctx, PROBE_X - 3, 196, 6, 100, 3); ctx.fill()
      ctx.fillStyle = P.glassFill
      ctx.strokeStyle = P.glass
      ctx.lineWidth = 1.2
      roundRect(ctx, PROBE_X - 3, 294, 6, BK_BOTTOM - 26 - 294, 2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.arc(PROBE_X, BK_BOTTOM - 24, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      // cable
      ctx.strokeStyle = themeRef.current === 'dark' ? '#475569' : '#334155'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(PROBE_X, 198)
      ctx.bezierCurveTo(PROBE_X, 150, METER.x - 30, 160, METER.x, METER.y + 40)
      ctx.stroke()

      // ── Beaker glass ──
      ctx.strokeStyle = P.glass
      ctx.lineWidth = 2.5
      beakerPath(ctx); ctx.stroke()
      // lip & spout
      ctx.beginPath()
      ctx.moveTo(BK_L - 7, BK_TOP - 3)
      ctx.quadraticCurveTo(BK_L - 2, BK_TOP - 1, BK_L, BK_TOP + 4)
      ctx.moveTo(BK_R + 4, BK_TOP - 1)
      ctx.lineTo(BK_R, BK_TOP + 3)
      ctx.stroke()
      // graduations
      ctx.strokeStyle = P.tick
      ctx.lineWidth = 1
      for (let i = 1; i <= 4; i++) {
        const y = BK_BOTTOM - ((BK_BOTTOM - BK_TOP) * i) / 5
        ctx.beginPath(); ctx.moveTo(BK_L + 6, y); ctx.lineTo(BK_L + (i % 2 === 0 ? 20 : 14), y); ctx.stroke()
      }
      // shine
      ctx.fillStyle = P.shine
      roundRect(ctx, BK_R - 14, BK_TOP + 12, 4, BK_BOTTOM - BK_TOP - 30, 2); ctx.fill()

      // ── pH meter ──
      ctx.fillStyle = themeRef.current === 'dark' ? '#0b1220' : '#1e293b'
      ctx.strokeStyle = themeRef.current === 'dark' ? '#334155' : '#0f172a'
      ctx.lineWidth = 1.5
      roundRect(ctx, METER.x, METER.y, METER.w, METER.h, 16); ctx.fill(); ctx.stroke()
      // screen
      const scrX = METER.x + 12, scrY = METER.y + 14, scrW = METER.w - 24, scrH = 64
      ctx.fillStyle = '#0a1a14'
      roundRect(ctx, scrX, scrY, scrW, scrH, 9); ctx.fill()
      const phCol = phColor(s.currentPH)
      const sg = ctx.createRadialGradient(scrX + scrW / 2, scrY + scrH / 2, 4, scrX + scrW / 2, scrY + scrH / 2, scrW * 0.7)
      sg.addColorStop(0, phCol.replace('rgb', 'rgba').replace(')', ',0.22)'))
      sg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = sg
      roundRect(ctx, scrX, scrY, scrW, scrH, 9); ctx.fill()
      ctx.fillStyle = 'rgba(226,232,240,0.6)'
      ctx.font = `700 10px ${FONT}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('pH', scrX + 8, scrY + 15)
      ctx.fillStyle = phCol
      ctx.font = `800 34px ${MONO}`
      ctx.textAlign = 'center'
      ctx.fillText(s.currentPH.toFixed(2), scrX + scrW / 2 + 6, scrY + 50)
      // mini spectrum
      const spX = scrX, spY = scrY + scrH + 12, spW = scrW
      const spec = ctx.createLinearGradient(spX, 0, spX + spW, 0)
      for (let p = 0; p <= 14; p += 1) spec.addColorStop(p / 14, phColor(p))
      ctx.fillStyle = spec
      roundRect(ctx, spX, spY, spW, 6, 3); ctx.fill()
      const mx = spX + (spW * Math.max(0, Math.min(14, s.currentPH))) / 14
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.moveTo(mx, spY - 1); ctx.lineTo(mx - 5, spY - 8); ctx.lineTo(mx + 5, spY - 8); ctx.closePath()
      ctx.fill()
      // label (shrinks to fit)
      const label = tRef.current('experiment.phMeter')
      let fs = 12
      ctx.font = `600 ${fs}px ${FONT}`
      while (ctx.measureText(label).width > scrW - 8 && fs > 8) { fs -= 0.5; ctx.font = `600 ${fs}px ${FONT}` }
      ctx.fillStyle = 'rgba(203,213,225,0.85)'
      ctx.fillText(label, METER.x + METER.w / 2, METER.y + METER.h - 22)

      // ── Labels ──
      pill(ctx, tRef.current('experiment.burette'), BX + TUBE_HALF + 34, TUBE_TOP + 6, 'left', P, textK)
      pill(ctx, tRef.current('experiment.beaker'), BK_L - 10, (BK_TOP + BK_BOTTOM) / 2, 'right', P, textK)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, []) // Intentional empty deps: loop reads from refs

  const region = phRegion(state.currentPH)
  const nearEquiv = state.addedVol > 0.1 && state.equivalencePoints.some(ep => Math.abs(ep.volume - state.addedVol) < Math.max(0.4, ep.volume * 0.012))
  const statusKey = state.status === 'running' ? 'running' : state.status === 'done' ? 'done' : state.addedVol > 0 ? 'stopped' : 'before'

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <h2 className="card-title m-0">
          <span className="card-title-icon"><FlaskIcon size={16} /></span>
          {t('experiment.title')}
        </h2>
        <span className={`chip ${statusKey === 'running' ? 'chip-accent' : statusKey === 'done' ? 'chip-success' : 'chip-muted'}`}>
          <span
            aria-hidden="true"
            className="inline-block rounded-full"
            style={{ width: 7, height: 7, background: 'currentColor', animation: statusKey === 'running' ? 'glow 1.2s ease-in-out infinite' : undefined }}
          />
          {statusKey === 'stopped' ? t('controls.stopped') : t(`controls.status.${statusKey}`)}
        </span>
      </div>

      <div className="relative mx-3 rounded-2xl overflow-hidden" style={{ height: 'clamp(250px, 44vh, 440px)', border: '1px solid var(--color-border)' }}>
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          role="img"
          aria-label={t('experiment.ariaLabel', { ph: state.currentPH.toFixed(2), vol: state.addedVol.toFixed(1) })}
        />

        {/* HUD: current pH */}
        <div
          className="absolute left-2.5 top-2.5 rounded-xl px-3 py-2 border"
          style={{ background: 'color-mix(in srgb, var(--color-surface) 88%, transparent)', borderColor: 'var(--color-border)', backdropFilter: 'blur(6px)' }}
        >
          <div className="flex items-center gap-1.5 eyebrow">
            <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: phColor(state.currentPH), boxShadow: `0 0 0 3px color-mix(in srgb, ${phColor(state.currentPH)} 25%, transparent)` }} />
            {t('controls.currentPH')}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="mono text-[26px] sm:text-[30px] font-extrabold leading-none" style={{ color: 'var(--color-text)' }}>
              {state.currentPH.toFixed(2)}
            </span>
            <span className="text-xs font-bold" style={{ color: phColor(state.currentPH), filter: 'saturate(1.2) brightness(0.85)' }}>
              {t(`region.${region}`)}
            </span>
          </div>
        </div>

        {nearEquiv && (
          <div className="absolute left-1/2 bottom-2.5 -translate-x-1/2 anim-pop">
            <span className="chip anim-glow" style={{ background: '#f59e0b', color: '#fff', fontSize: 13, padding: '6px 14px' }} role="status">
              <TargetIcon size={14} /> {t('experiment.equivalenceReached')}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-3">
        <PHScale ph={state.currentPH} />
      </div>

      <div id="playback-bar" className="flex flex-col gap-3 px-4 pt-3 pb-4" role="group" aria-label={t('controls.playback')}>
        <PlaybackButtons />
        <SeekSlider />
      </div>
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Beaker outline (open top). inset shrinks it for the liquid clip. */
function beakerPath(ctx: CanvasRenderingContext2D, inset = 0) {
  const r = 12
  ctx.beginPath()
  ctx.moveTo(BK_L + inset, BK_TOP)
  ctx.lineTo(BK_L + inset, BK_BOTTOM - r)
  ctx.quadraticCurveTo(BK_L + inset, BK_BOTTOM - inset, BK_L + r, BK_BOTTOM - inset)
  ctx.lineTo(BK_R - r, BK_BOTTOM - inset)
  ctx.quadraticCurveTo(BK_R - inset, BK_BOTTOM - inset, BK_R - inset, BK_BOTTOM - r)
  ctx.lineTo(BK_R - inset, BK_TOP)
  if (inset) ctx.closePath()
}

function pill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'right',
  P: typeof PALETTE.light,
  k = 1,
) {
  ctx.font = `600 ${11 * k}px ${FONT}`
  const w = ctx.measureText(text).width + 14
  const left = align === 'left' ? x : x - w
  ctx.fillStyle = P.labelBg
  ctx.strokeStyle = P.tick
  ctx.lineWidth = 0.8
  roundRect(ctx, left, y - 10 * k, w, 20 * k, 10 * k); ctx.fill(); ctx.stroke()
  ctx.fillStyle = P.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, left + w / 2, y + 0.5)
  ctx.textBaseline = 'alphabetic'
}
